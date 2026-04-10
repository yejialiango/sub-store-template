const { type, name, start_tailscale, ts_auth_key } = $arguments

let config = JSON.parse($files[0])
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

config.outbounds.push(...proxies)

// 检查各地区是否有匹配的节点
const regionChecks = {
  '🇭🇰香港': getTags(proxies, /港|hk|hongkong|hong kong|🇭🇰/i),
  '🇨🇳台湾': getTags(proxies, /台|tw|taiwan|🇹🇼/i),
  '🇯🇵日本': getTags(proxies, /日本|jp|japan|🇯🇵/i),
  '🇸🇬新加坡': getTags(proxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i),
  '🇺🇸美国': getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i)
}

// 收集需要移除的地区标签（移除没有节点的地区 selector 和 AUTO 组）
const regionsToRemove = []
Object.entries(regionChecks).forEach(([regionName, tags]) => {
  if (tags.length === 0) {
    regionsToRemove.push(regionName)
    regionsToRemove.push(regionName + '-AUTO')
  }
})

// 填充有节点的地区分组（selector 和 urltest 两种类型）
config.outbounds.forEach(i => {
  // 填充全局自动选择
  if (i.tag === '自动选择' && getTags(proxies).length > 0) {
    i.outbounds.push(...getTags(proxies))
  }

  // 填充各地区的 selector 组（手动选择）
  if (i.tag === '🇭🇰香港' && regionChecks['🇭🇰香港'].length > 0) {
    i.outbounds.push(...regionChecks['🇭🇰香港'])
  }
  if (i.tag === '🇨🇳台湾' && regionChecks['🇨🇳台湾'].length > 0) {
    i.outbounds.push(...regionChecks['🇨🇳台湾'])
  }
  if (i.tag === '🇯🇵日本' && regionChecks['🇯🇵日本'].length > 0) {
    i.outbounds.push(...regionChecks['🇯🇵日本'])
  }
  if (i.tag === '🇸🇬新加坡' && regionChecks['🇸🇬新加坡'].length > 0) {
    i.outbounds.push(...regionChecks['🇸🇬新加坡'])
  }
  if (i.tag === '🇺🇸美国' && regionChecks['🇺🇸美国'].length > 0) {
    i.outbounds.push(...regionChecks['🇺🇸美国'])
  }

  // 填充各地区的 AUTO 组（自动选择）
  if (i.tag === '🇭🇰香港-AUTO' && regionChecks['🇭🇰香港'].length > 0) {
    i.outbounds.push(...regionChecks['🇭🇰香港'])
  }
  if (i.tag === '🇨🇳台湾-AUTO' && regionChecks['🇨🇳台湾'].length > 0) {
    i.outbounds.push(...regionChecks['🇨🇳台湾'])
  }
  if (i.tag === '🇯🇵日本-AUTO' && regionChecks['🇯🇵日本'].length > 0) {
    i.outbounds.push(...regionChecks['🇯🇵日本'])
  }
  if (i.tag === '🇸🇬新加坡-AUTO' && regionChecks['🇸🇬新加坡'].length > 0) {
    i.outbounds.push(...regionChecks['🇸🇬新加坡'])
  }
  if (i.tag === '🇺🇸美国-AUTO' && regionChecks['🇺🇸美国'].length > 0) {
    i.outbounds.push(...regionChecks['🇺🇸美国'])
  }

  // 为其他服务 outbound 添加所有节点
  if (['proxy', '🔍Google谷歌', '🍎Apple苹果', '✈️Telegram电报', '📺Bilibili哔哩哔哩', '🎬Netflix奈飞', '🐟Bahamut巴哈姆特', '🎥YouTube油管', '🤖OpenAI', 'cn', 'final', 'GLOBAL'].includes(i.tag)) {
    const allProxyTags = getTags(proxies)
    if (allProxyTags.length > 0) {
      // 在已有outbounds后添加所有节点
      i.outbounds.push(...allProxyTags)
    }
  }
})

// 移除没有节点的地区分组
config.outbounds = config.outbounds.filter(i => !regionsToRemove.includes(i.tag))

// 从其他 outbound 的引用中移除不存在的地区组
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds)) {
    outbound.outbounds = outbound.outbounds.filter(tag => !regionsToRemove.includes(tag))
  }
})

// Tailscale 支持
if (start_tailscale === 'true' && ts_auth_key) {
  // 添加 dns.servers
  config.dns.servers.push({
    type: 'tailscale',
    tag: 'dns_ts',
    endpoint: 'ts-ep',
    accept_default_resolvers: false
  }, {
    type: 'udp',
    tag: 'dns_futu',
    detour: 'ts-ep',
    server: '10.13.56.4'
  })

  // 从原有 dns.rules 中移除包含 futu-private 的合并规则，拆分处理
  config.dns.rules = config.dns.rules.filter(rule => {
    if (Array.isArray(rule.rule_set) && rule.rule_set.includes('futu-private')) return false
    return true
  })

  // 在 dns.rules 最前面添加规则（按顺序：futu-private, tailscale-domains, surfingboy）
  config.dns.rules.unshift(
    { rule_set: 'futu-private', server: 'dns_futu' },
    { rule_set: 'tailscale-domains', server: 'dns_ts' },
    { rule_set: ['surfingboy-personal', 'surfingboy-direct'], server: 'dns_direct' }
  )

  // 添加 🔗Tailscale selector outbound
  // 包含 ts-ep, direct, proxy, 以及类似 proxy 的地区组
  const tsRouteOutbound = {
    tag: '🔗Tailscale',
    type: 'selector',
    outbounds: [
      'ts-ep',
      'direct',
      'proxy',
      '🇭🇰香港-AUTO',
      '🇨🇳台湾-AUTO',
      '🇯🇵日本-AUTO',
      '🇸🇬新加坡-AUTO',
      '🇺🇸美国-AUTO',
      '🇭🇰香港',
      '🇨🇳台湾',
      '🇯🇵日本',
      '🇸🇬新加坡',
      '🇺🇸美国',
      '自动选择'
    ],
    default: 'direct'
  }
  // 过滤掉不存在的地区组
  tsRouteOutbound.outbounds = tsRouteOutbound.outbounds.filter(tag =>
    ['ts-ep', 'direct', 'proxy'].includes(tag) || !regionsToRemove.includes(tag)
  )
  config.outbounds.unshift(tsRouteOutbound)

  // 从原有 route.rules 中移除包含 futu-private 的合并规则，拆分处理
  config.route.rules = config.route.rules.filter(rule => {
    if (Array.isArray(rule.rule_set) && rule.rule_set.includes('futu-private')) return false
    return true
  })
  // 保留 surfingboy-personal + surfingboy-direct → direct
  config.route.rules.push({
    rule_set: ['surfingboy-personal', 'surfingboy-direct'],
    outbound: 'direct'
  })

  // 在 route.rules 最前面添加规则（按顺序：tailscale-domains, futu-private+tailscale-route-cidrs）
  config.route.rules.unshift(
    { rule_set: 'tailscale-domains', outbound: 'ts-ep' },
    { rule_set: ['futu-private', 'tailscale-route-cidrs'], outbound: '🔗Tailscale' }
  )

  // 添加 endpoints
  config.endpoints = [
    {
      type: 'tailscale',
      tag: 'ts-ep',
      auth_key: ts_auth_key,
      accept_routes: true
    }
  ]
}

$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
