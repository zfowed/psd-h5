/**
 * @Author: zfowed
 * @Date: 2018-02-26 23:44:56
 * @Last Modified by: zfowed
 * @Last Modified time: 2018-02-27 00:29:46
 */



'use strict';

const argv = require('yargs').argv
const PsdH5 = require('../index');

const psdH5 = new PsdH5(argv.psd);

psdH5.exportToSiteDirectory(argv).then(_ => {
    console.log('ok');
}, error => {
    console.log(error)
})
