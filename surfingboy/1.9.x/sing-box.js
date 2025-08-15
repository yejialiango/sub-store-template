const { type, name } = $arguments

let config = JSON.parse($files[0])
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

config.outbounds.push(...proxies)

config.outbounds.map(i => {
  if (['all', 'all-auto'].includes(i.tag)) {
    const tags = getTags(proxies)
    if (tags.length > 0) {
      i.outbounds.push(...tags)
    } else {
      i.outbounds.push('direct')
    }
  }
  if (['hk', 'hk-auto'].includes(i.tag)) {
    const tags = getTags(proxies, /港|hk|hongkong|kong kong|🇭🇰/i)
    if (tags.length > 0) {
      i.outbounds.push(...tags)
    } else {
      i.outbounds.push('direct')
    }
  }
  if (['tw', 'tw-auto'].includes(i.tag)) {
    const tags = getTags(proxies, /台|tw|taiwan|🇹🇼/i)
    if (tags.length > 0) {
      i.outbounds.push(...tags)
    } else {
      i.outbounds.push('direct')
    }
  }
  if (['jp', 'jp-auto'].includes(i.tag)) {
    const tags = getTags(proxies, /日本|jp|japan|🇯🇵/i)
    if (tags.length > 0) {
      i.outbounds.push(...tags)
    } else {
      i.outbounds.push('direct')
    }
  }
  if (['sg', 'sg-auto'].includes(i.tag)) {
    const tags = getTags(proxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i)
    if (tags.length > 0) {
      i.outbounds.push(...tags)
    } else {
      i.outbounds.push('direct')
    }
  }
  if (['us', 'us-auto'].includes(i.tag)) {
    const tags = getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i)
    if (tags.length > 0) {
      i.outbounds.push(...tags)
    } else {
      i.outbounds.push('direct')
    }
  }
})

$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
