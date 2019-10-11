const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

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
const exec = promisify(child_process.exec);

const readTxt = async (filePath) => {
  return await readFile(filePath, 'utf-8');
};

const writeTxt = async (filePath, txt) => {
  await mkdirp(path.dirname(filePath));
  return await writeFile(filePath, txt, 'utf-8');
};

module.exports = {
  promisify,
  readTxt,
  writeTxt,
  exec
};
