#!/usr/bin/env node
/**
 * Patches Electron.app's Info.plist so macOS shows the correct app name
 * in the menu bar and Dock during development (npm run dev).
 *
 * Without this, macOS reads CFBundleName from the Electron binary's bundle,
 * which is always "Electron" regardless of app.name set in main process.
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

if (os.platform() !== 'darwin') {
  process.exit(0)
}

const APP_NAME = 'SkillCraft IMS'
const plistPath = path.join(
  __dirname,
  '../node_modules/electron/dist/Electron.app/Contents/Info.plist'
)

if (!fs.existsSync(plistPath)) {
  console.log('patch-electron-name: Info.plist not found, skipping.')
  process.exit(0)
}

let content = fs.readFileSync(plistPath, 'utf-8')

content = content
  .replace(
    /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
    `<key>CFBundleDisplayName</key>\n\t<string>${APP_NAME}</string>`
  )
  .replace(
    /<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/,
    `<key>CFBundleName</key>\n\t<string>${APP_NAME}</string>`
  )

fs.writeFileSync(plistPath, content, 'utf-8')
console.log(`patch-electron-name: patched Info.plist → "${APP_NAME}"`)
