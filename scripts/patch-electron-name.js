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
const distDir = path.join(__dirname, '../node_modules/electron/dist')
const originalApp = path.join(distDir, 'Electron.app')
const renamedApp = path.join(distDir, `${APP_NAME}.app`)
const pathTxt = path.join(__dirname, '../node_modules/electron/path.txt')

// Step 1: Rename Electron.app → SkillCraft IMS.app (Dock reads the folder name)
if (fs.existsSync(originalApp)) {
  fs.renameSync(originalApp, renamedApp)
  console.log(`patch-electron-name: renamed Electron.app → "${APP_NAME}.app"`)
} else if (!fs.existsSync(renamedApp)) {
  console.log('patch-electron-name: Electron.app not found and renamed app not found, skipping.')
  process.exit(0)
}

// Step 2: Update path.txt so the electron module finds the binary at the new location
if (fs.existsSync(pathTxt)) {
  const newPath = `${APP_NAME}.app/Contents/MacOS/Electron`
  fs.writeFileSync(pathTxt, newPath, 'utf-8')
  console.log(`patch-electron-name: updated path.txt → "${newPath}"`)
}

const plistPath = path.join(renamedApp, 'Contents/Info.plist')

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

// LSDisplayName overrides the Dock tooltip and Finder name
if (!content.includes('<key>LSDisplayName</key>')) {
  content = content.replace(
    '</dict>\n</plist>',
    `\t<key>LSDisplayName</key>\n\t<string>${APP_NAME}</string>\n</dict>\n</plist>`
  )
} else {
  content = content.replace(
    /<key>LSDisplayName<\/key>\s*<string>[^<]*<\/string>/,
    `<key>LSDisplayName</key>\n\t<string>${APP_NAME}</string>`
  )
}

fs.writeFileSync(plistPath, content, 'utf-8')
console.log(`patch-electron-name: patched Info.plist → "${APP_NAME}"`)
