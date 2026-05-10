// Copy Next standalone server (with node_modules) + .next/static + public into the packed app.
// electron-builder's `extraResources` strips node_modules, so we copy manually.
const fs = require("node:fs");
const path = require("node:path");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else if (stat.isSymbolicLink()) {
    fs.symlinkSync(fs.readlinkSync(src), dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

exports.default = async function afterPack(context) {
  const projectRoot = context.packager.projectDir;
  const resourcesPath = context.packager.platform.name === "mac"
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
    : path.join(context.appOutDir, "resources");

  const target = path.join(resourcesPath, "app", ".next", "standalone");
  fs.mkdirSync(target, { recursive: true });

  // Copy entire standalone (including node_modules) — overwrites existing partial copy
  const standaloneSrc = path.join(projectRoot, ".next", "standalone");
  console.log(`[afterPack] copying ${standaloneSrc} -> ${target}`);
  copyRecursive(standaloneSrc, target);

  // .next/static must be at .next/static under standalone root
  const staticSrc = path.join(projectRoot, ".next", "static");
  const staticDest = path.join(target, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    console.log(`[afterPack] copying static -> ${staticDest}`);
    fs.rmSync(staticDest, { recursive: true, force: true });
    copyRecursive(staticSrc, staticDest);
  }

  // public next to server.js
  const publicSrc = path.join(projectRoot, "public");
  const publicDest = path.join(target, "public");
  if (fs.existsSync(publicSrc)) {
    console.log(`[afterPack] copying public -> ${publicDest}`);
    fs.rmSync(publicDest, { recursive: true, force: true });
    copyRecursive(publicSrc, publicDest);
  }

  console.log("[afterPack] done");
};
