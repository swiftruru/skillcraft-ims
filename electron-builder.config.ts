import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.skillcraft.ims',
  productName: 'SkillCraft IMS',
  copyright: '© 2026 SkillCraft IMS',
  directories: {
    output: 'release',
    buildResources: 'resources'
  },
  files: ['out/**/*', 'package.json'],
  extraResources: [],
  mac: {
    target: [
      { target: 'dmg' }
    ],
    icon: 'resources/icon.icns',
    category: 'public.app-category.business',
    darkModeSupport: true
  },
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ],
    icon: 'resources/icon.ico'
  },
  linux: {
    target: ['AppImage'],
    category: 'Office'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'resources/icon.ico',
    installerHeaderIcon: 'resources/icon.ico'
  },
  dmg: {
    title: 'SkillCraft IMS',
    backgroundColor: '#0f172a'
  },
  publish: {
    provider: 'github',
    owner: 'swiftruru',
    repo: 'skillcraft-ims'
  }
}

export default config
