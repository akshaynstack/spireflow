// `node-global-key-listener` ships a key server per platform in its bin/ dir.
// Only the current platform's binary is needed; the others are dead weight and
// trip antivirus heuristics during installer archiving (e.g. Windows Defender
// flagging the Mach-O `MacKeyServer` as "potentially unwanted software"). Drop
// the irrelevant ones after packing, before the installer is archived.
const { rm } = require('node:fs/promises')
const { join } = require('node:path')

const UNWANTED = {
  win32: ['MacKeyServer', 'X11KeyServer'],
  darwin: ['WinKeyServer.exe', 'X11KeyServer'],
  linux: ['WinKeyServer.exe', 'MacKeyServer']
}

module.exports = async function afterPack(context) {
  const platform = context.electronPlatformName
  const names = UNWANTED[platform] || []
  if (names.length === 0) return

  const resourcesDir =
    platform === 'darwin'
      ? join(context.appOutDir, 'Resources')
      : join(context.appOutDir, 'resources')
  const binDir = join(resourcesDir, 'app.asar.unpacked', 'node_modules', 'node-global-key-listener', 'bin')

  for (const name of names) {
    await rm(join(binDir, name), { force: true })
  }
  console.log(`[afterPack] removed ${names.join(', ')} (unused on ${platform})`)
}
