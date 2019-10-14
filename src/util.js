const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const _ = require('lodash');

const promisify = (fn) => {
  if (typeof fn !== 'function') {
    throw new Error(`Expect function to promisify, but got ${fn}`);
  }
  return async (...args) => {
    return new Promise((resolve, reject) => {
      try {
        fn(...args, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  };
};

const mkdirp = promisify(require('mkdirp'));
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const exec = promisify(child_process.exec);

const readTxt = async (filePath) => {
  return await readFile(filePath, 'utf-8');
};

const writeTxt = async (filePath, txt) => {
  await mkdirp(path.dirname(filePath));
  return await writeFile(filePath, txt, 'utf-8');
};

const listDir = async (dirPath) => {
  const items = await readdir(dirPath);

  const files = await Promise.all(items.map(async (item) => {
    try {
      const childFilePath = path.resolve(dirPath, item);
      const stats = await stat(childFilePath);
      return {
        name: childFilePath,
        type: stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other'
      };

    } catch (err) {
      return null;
    }
  }));

  return _.compact(files);
};

module.exports = {
  promisify,
  readTxt,
  writeTxt,
  exec,
  readdir,
  listDir
};
