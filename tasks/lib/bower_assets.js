var _ = require('lodash');
var Emitter = require('events').EventEmitter;
var path = require('path');
var grunt = require('grunt');

var BowerAssets = function(bower, cwd) {
  this.bower = bower;
  this.cwd = cwd;
  this.config = bower.config.json;
};

BowerAssets.prototype = Object.create(Emitter.prototype);
BowerAssets.prototype.constructor = BowerAssets;

BowerAssets.prototype.get = function() {
  var bower = this.bower;
  var bowerConfig = grunt.file.readJSON(path.join(this.cwd, this.config));
  var exportsOverride = bowerConfig.exportsOverride;

  var paths = bower.commands.list({paths: true});
  paths.on('data', function(data) {
    this.emit('data', this.mergePaths(data, exportsOverride ? exportsOverride : {}));
  }.bind(this));
  paths.on('error', function(err) {
    this.emit('error', err);
  }.bind(this));

  return this;
};

BowerAssets.prototype.mergePaths = function(allPaths, overrides) {
  var copyOverrides = _.clone(overrides);
  var bowerAssets = {'__untyped__': {}};
  var cwd = this.cwd;
  var componentsLocation = this.bower.config.directory;
  _(allPaths).each(function(pkgPaths, pkg) {
    var pkgOverrides = copyOverrides[pkg];
    delete copyOverrides[pkg];

    var createExpandedPath = function(overriddenPaths, assetType) {
      bowerAssets[assetType] = bowerAssets[assetType] || {};

      var pkgPath = path.join(componentsLocation, pkg);
      var basePath = path.join(cwd, pkgPath);

      bowerAssets[assetType][pkg] = _(grunt.file.expand({cwd: basePath}, overriddenPaths)).map(function(expandedPath) {
        return path.join(pkgPath, expandedPath);
      });
    };

    if (pkgOverrides) {
      _(pkgOverrides).each(createExpandedPath);
    } else if (!_.isEmpty(copyOverrides)){
      _(copyOverrides).each(function(override, key) {
        var reg = new RegExp(key, 'gi');
        if (pkg.match(reg)) {
          _(override).each(createExpandedPath);
        }
      });
    } else {
      if (!_.isArray(pkgPaths)) {
        pkgPaths = [ pkgPaths ];
      }
      bowerAssets['__untyped__'][pkg] = pkgPaths;
    }
  }, this);

  return bowerAssets;
};

module.exports = BowerAssets;
