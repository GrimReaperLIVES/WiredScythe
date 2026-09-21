const repositorySlug = process.env.GITHUB_REPOSITORY ?? "";
const [repositoryOwner, repositoryName] = repositorySlug.split("/");
const hasGitHubRepository = Boolean(repositoryOwner && repositoryName);
const windowsPublisherName = process.env.WINDOWS_PUBLISHER_NAME?.trim();

module.exports = {
  appId: "app.wiredscythe.viewer",
  productName: "WiredScythe",
  artifactName: "WiredScythe-Setup-x64.${ext}",
  asar: true,
  compression: "normal",
  electronUpdaterCompatibility: ">=2.16",
  directories: {
    buildResources: "build",
    output: "release",
  },
  files: ["dist/**/*", "dist-electron/**/*", "package.json"],
  extraResources: [
    { from: "build/wiredscythe-icon.png", to: "icon.png" },
    { from: "THIRD_PARTY_NOTICES.md", to: "THIRD_PARTY_NOTICES.md" },
    {
      from: "vendor/native",
      to: "native",
      filter: ["streamlink/**/*", "NATIVE_RUNTIME_SOURCES.md", "THIRD_PARTY_NOTICES.md", "versions.json"],
    },
    {
      from: "native/streamlink-launcher.py",
      to: "native/streamlink-launcher.py",
    },
  ],
  win: {
    // Windows shortcuts and the installed executable need a real ICO
    // container; using the source PNG here can fall back to a blank document
    // icon on some Windows shells.
    icon: "build/icon.ico",
    executableName: "WiredScythe",
    verifyUpdateCodeSignature: true,
    ...(windowsPublisherName ? { publisherName: windowsPublisherName } : {}),
    target: [{ target: "nsis", arch: ["x64"] }],
    publish: hasGitHubRepository
      ? [
          {
            provider: "github",
            owner: repositoryOwner,
            repo: repositoryName,
            releaseType: "release",
          },
        ]
      : undefined,
  },
  mac: {
    category: "public.app-category.entertainment",
    target: ["dmg", "zip"],
    // A PNG is accepted by electron-builder for unsigned local builds. Add an
    // Apple Developer identity later to enable signing and notarization.
    icon: "build/wiredscythe-icon.png",
    publish: hasGitHubRepository
      ? [
          {
            provider: "github",
            owner: repositoryOwner,
            repo: repositoryName,
            releaseType: "release",
          },
        ]
      : undefined,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "WiredScythe",
    uninstallDisplayName: "WiredScythe",
  },
};
