const { getOptions } = require('loader-utils');
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

  const pth = path.parse(this.resourcePath);

  const urlLoader = require('url-loader');

  const origin = urlLoader.call({...this, query: url_loader_options}, src);
  const results = [];
  for (const scale of scales) {
    const p = path.join(pth.dir, pth.name + '@' + scale + pth.ext);
    const result = urlLoader.call({...this, resourcePath: p, query: url_loader_options}, fs.readFileSync(p));
    this.addDependency(p);
    results.push({scale, result});
  }

  return `${origin}
const src = module.exports;

const scales = ${JSON.stringify(results.map(({scale}) => scale))};
const images = [];
${results.map(({result}) => result + "\nimages.push(module.exports);").join("\n")}
const srcset = images.length > 0 ? images.map((image, i) => image + ' ' + scales[i]).join(', ') : null;

const cssImage = \`url(\${src})\`;
const cssImageSet = images.length > 0 ? images.map((image, i) => \`url(\${image})\` + ' ' + scales[i]).join(', ') : null;

module.exports = {
  src,
  srcset,
  cssImage,
  cssImageSet,
};`;
}

module.exports.raw = true;
