var gulp = require('gulp');
var fs = require('fs');
var gutil = require('gulp-util');
var cproc = require('child_process');
var os = require('os');
var del = require('del');
var path = require('path');

function installSqlToolsService(platform) {
   var install = require('../out/src/languageservice/serviceInstallerUtil');
   return install.installService(platform);
}

gulp.task('ext:install-service', () => {
    return installSqlToolsService();
});

function doPackageSync(packageName) {
    var vsceArgs = [];
    vsceArgs.push('vsce');
    vsceArgs.push('package'); // package command

    if (packageName !== undefined) {
        vsceArgs.push('-o');
        vsceArgs.push(packageName);
    }
    var command = vsceArgs.join(' ');
    console.log(command);
    return cproc.execSync(command);
}

function cleanServiceInstallFolder() {
    var install = require('../out/src/languageservice/serviceInstallerUtil');
    var serviceInstallFolder = install.getServiceInstallDirectoryRoot();
    console.log('Deleting Service Install folder: ' + serviceInstallFolder);
    return del(serviceInstallFolder + '/*');
}

function doOfflinePackage(runtimeId, platform, packageName) {
    return installSqlToolsService(platform).then(() => {
       return doPackageSync(packageName + '-' + runtimeId + '.vsix');
    });
}

//Install vsce to be able to run this task: npm install -g vsce
gulp.task('package:online', () => {
    return cleanServiceInstallFolder().then(() => {
         doPackageSync();
         return installSqlToolsService();
    });
});

//Install vsce to be able to run this task: npm install -g vsce
gulp.task('package:offline', () => {
    const platform = require('../out/src/models/platform');
    const Runtime = platform.Runtime;
    var json = JSON.parse(fs.readFileSync('package.json'));
    var name = json.name;
    var version = json.version;
    var packageName = name + '-' + version;

    var packages = [];
    packages.push({rid: 'win-x64', runtime: Runtime.Windows_64});
    packages.push({rid: 'osx', runtime: Runtime.OSX});
    packages.push({rid: 'linux-x64', runtime: Runtime.Linux_86});

    var promise = Promise.resolve();
    cleanServiceInstallFolder().then(() => {
            packages.forEach(data => {
              promise = promise.then(() => {
                 return doOfflinePackage(data.rid, data.runtime, packageName).then(() => {
                        return cleanServiceInstallFolder();
                 });
              });
           });
    });

    return promise;
});