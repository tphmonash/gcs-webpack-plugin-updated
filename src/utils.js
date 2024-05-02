// eslint-disable-next-line import/prefer-default-export
export function pick(object, paths) {
  return paths.reduce((accumulator, path) => {
    if (Object.prototype.hasOwnProperty.call(object, path)) {
      accumulator[path] = object[path];
    }
    return accumulator;
  }, {});
}
