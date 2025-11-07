const { type, name } = $arguments

let config = JSON.parse($files[0])
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

config.outbounds.push(...proxies)

// 检查各地区是否有匹配的节点并重命名
const regionChecks = {
  '🇭🇰香港': getTags(proxies, /港|hk|hongkong|hong kong|🇭🇰/i),
  '🇨🇳台湾': getTags(proxies, /台|tw|taiwan|🇹🇼/i),
  '🇯🇵日本': getTags(proxies, /日本|jp|japan|🇯🇵/i),
  '🇸🇬新加坡': getTags(proxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i),
  '🇺🇸美国': getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i)
}

// 收集需要移除的地区标签（移除all和手动地区选择器）
const regionsToRemove = ['all', 'hk', 'tw', 'jp', 'sg', 'us']
Object.entries(regionChecks).forEach(([regionName, tags]) => {
  if (tags.length === 0) {
    regionsToRemove.push(regionName)
  }
})

// 重命名地区自动选择器和all-auto
config.outbounds.forEach(i => {
  if (i.tag === 'all-auto') {
    i.tag = '自动选择'
  }
  if (i.tag === 'hk-auto' && regionChecks['🇭🇰香港'].length > 0) {
    i.tag = '🇭🇰香港'
  }
  if (i.tag === 'tw-auto' && regionChecks['🇨🇳台湾'].length > 0) {
    i.tag = '🇨🇳台湾'
  }
  if (i.tag === 'jp-auto' && regionChecks['🇯🇵日本'].length > 0) {
    i.tag = '🇯🇵日本'
  }
  if (i.tag === 'sg-auto' && regionChecks['🇸🇬新加坡'].length > 0) {
    i.tag = '🇸🇬新加坡'
  }
  if (i.tag === 'us-auto' && regionChecks['🇺🇸美国'].length > 0) {
    i.tag = '🇺🇸美国'
  }
})

// 填充有节点的地区分组和自动选择
config.outbounds.forEach(i => {
  if (i.tag === '自动选择' && getTags(proxies).length > 0) {
    i.outbounds.push(...getTags(proxies))
  }
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
  
  // 为proxy和其他服务outbound添加所有节点
  if (['proxy', '🔍Google谷歌', '🍎Apple苹果', '✈️Telegram电报', '📺Bilibili哔哩哔哩', '🎬Netflix奈飞', '🐟Bahamut巴哈姆特', '🎥YouTube油管', '🤖OpenAI', 'cn', 'final'].includes(i.tag)) {
    const allProxyTags = getTags(proxies)
    if (allProxyTags.length > 0) {
      // 在已有outbounds后添加所有节点
      i.outbounds.push(...allProxyTags)
    }
  }
})

// 移除没有节点的地区分组
config.outbounds = config.outbounds.filter(i => !regionsToRemove.includes(i.tag))

// 从其他outbound的引用中移除不存在的地区组，并更新引用
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds)) {
    // 移除不存在的地区组引用
    outbound.outbounds = outbound.outbounds.filter(tag => !regionsToRemove.includes(tag))
    
    // 更新地区组引用为新的中文名称
    outbound.outbounds = outbound.outbounds.map(tag => {
      if (tag === 'all-auto') return '自动选择'
      if (tag === 'hk-auto' && !regionsToRemove.includes('🇭🇰香港')) return '🇭🇰香港'
      if (tag === 'tw-auto' && !regionsToRemove.includes('🇨🇳台湾')) return '🇨🇳台湾'
      if (tag === 'jp-auto' && !regionsToRemove.includes('🇯🇵日本')) return '🇯🇵日本'
      if (tag === 'sg-auto' && !regionsToRemove.includes('🇸🇬新加坡')) return '🇸🇬新加坡'
      if (tag === 'us-auto' && !regionsToRemove.includes('🇺🇸美国')) return '🇺🇸美国'
      return tag
    })
  }
})

$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
