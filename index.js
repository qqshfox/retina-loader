const { getOptions } = require('loader-utils');
const sizeOf = require('image-size');
const path = require('path');
const fs = require('fs');

const DEFAULT_SCALES = ['2x', '3x'];
const DEFAULT_URL_LOADER_OPTIONS = {
  limit: 4096,
  name: 'img/[name].[hash:8].[ext]',
};

module.exports = function loader(src) {
  const options = getOptions(this) || {};
  const scales = options.scales || DEFAULT_SCALES;
  const url_loader_options = options['url-loader'] || DEFAULT_URL_LOADER_OPTIONS;

  const dimensions = sizeOf(this.resourcePath);

  const pth = path.parse(this.resourcePath);

  const urlLoader = require('url-loader');

  const results = [];
  for (const scale of scales) {
    const p = path.join(pth.dir, pth.name + '@' + scale + pth.ext);
    try {
      const result = urlLoader.call({...this, resourcePath: p, query: url_loader_options}, fs.readFileSync(p));
      this.addDependency(p);
      results.push({scale, result});
    } catch (_err) {
    }
  }

  return `${src}
var src = module.exports;
var dimensions = ${JSON.stringify(dimensions)};

var scales = ['1x'];
scales = scales.concat(${JSON.stringify(results.map(({scale}) => scale))});
var images = [src];
${results.map(({result}) => result + "\nimages.push(module.exports);").join("\n")}
var srcset = images.length > 0 ? images.map(function (image, i) { return encodeURI(image) + ' ' + scales[i]}).join(', ') : null;

var cssImage = 'url(' + src + ')';
var cssImageSet = images.length > 0 ? images.map(function (image, i) { return 'url(' + image + ') ' + scales[i] }).join(', ') : null;

module.exports = [{
  src: src,
  srcset: srcset,
  cssImage: cssImage,
  cssImageSet: cssImageSet,
}, dimensions].reduce(function (r, o) {
  Object.keys(o).forEach(function (k) {
    r[k] = o[k];
  });
  return r;
}, {});

module.exports.toString = function () {
  return src;
}`;
}

module.exports.raw = true;
