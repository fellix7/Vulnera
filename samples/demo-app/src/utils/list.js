// Small list helpers. lodash is used here only for chunk(), which is not affected by any advisory.
const _ = require('lodash');

function paginate(items, pageSize) {
  return _.chunk(items, pageSize);
}

module.exports = { paginate };
