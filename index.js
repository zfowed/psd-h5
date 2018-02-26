/**
 * @Author: zfowed
 * @Date: 2018-02-25 21:41:13
 * @Last Modified by: zfowed
 * @Last Modified time: 2018-02-27 00:29:55
 */



'use strict';



const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const Psd = require('psd');
const cheerio = require('cheerio');



class PsdH5 {
    constructor(psdPath) {

        this.fse = fse;
        this.path = path;

        this.Psd = Psd;
        this.cheerio = cheerio;

        this.psd = Psd.fromFile(psdPath);
        this.psd.parse();

        this.name = this.path.basename(psdPath, this.path.extname(psdPath));
        this.tree = this.psd.tree();

    }

    objectToCssText(element, object) {
        let cssText = '';

        for (const key in object) {
            if (object.hasOwnProperty(key)) {
                const value = object[key];
                cssText += `${key}:${value};`;
            }
        }

        return `${element} {${cssText}}`;
    }

    async exportToSiteDirectory(option) {

        const fse = this.fse;
        const path = this.path;

        // 初始配置
        let config = {
            root: '',
            images: 'images',
            index: 'index.html',
            css: 'css/index.css',
            script: 'script/index.js',
            title: this.name,
            rem: this.tree.width / 10,
        };

        // 合并配置
        if (typeof option === 'string') {
            config.root = option
        } else if (typeof option === 'object') {
            Object.assign(config, option);
        }

        if (!config.root) {
            throw new Error('${root}不能为空！')
        }

        // 转换为绝对路径
        config.images = path.join(config.root, config.images);
        config.index = path.join(config.root, config.index);
        config.css = path.join(config.root, config.css);
        config.script = path.join(config.root, config.script);


        // 确保目录存在
        await fse.emptyDir(config.root);
        await fse.emptyDir(path.dirname(config.index));
        await fse.emptyDir(path.dirname(config.css));
        await fse.emptyDir(path.dirname(config.script));
        await fse.emptyDir(config.images);

        const pxToRem = px => Math.round((px / config.rem) * Math.pow(10, 6)) / Math.pow(10, 6) + 'rem';

        // css
        let cssText = 'html, body { min-height: 100%; max-width: 540px; margin: auto; position: relative; background: #f0f0f0; height: 100%; width: 100%; }';

        // dom
        const $ = cheerio.load('<html><head></head><body></body></html>');
        $('head').append('<meta charset="utf-8">');
        $('head').append('<meta content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" name="viewport">');
        $('head').append('<meta content="yes" name="apple-mobile-web-app-capable">');
        $('head').append('<meta content="black" name="apple-mobile-web-app-status-bar-style">');
        $('head').append('<meta content="telephone=no" name="format-detection">');
        $('head').append('<meta content="email=no" name="format-detection">');
        $('head').append(`<title>${config.title}</title>`);
        $('head').append(`<script type="text/javascript" src="http://g.tbcdn.cn/mtb/lib-flexible/0.3.4/flexible.js"></script>`);
        $('head').append('<link rel="stylesheet" type="text/css" href="css/index.css">');

        let layerIndex = 0;

        const analysisLayer = async ($element, layerTree) => {

            const layerId = layerIndex++;
            const elementClass = `layer-${layerId}`;

            $element.attr({
                'class': elementClass,
                'data-layer-name': layerTree.name
            });
            
            let cssData = {
                'position': 'absolute',
                'top': pxToRem(layerTree.coords.top),
                'left': pxToRem(layerTree.coords.left),
                'width': pxToRem(layerTree.width),
                'height': pxToRem(layerTree.height),
                'opacity': layerTree.layer.opacity ? layerTree.layer.opacity / 255 : 1,
                'overflow': 'hidden',
                'z-index': layerId,
            };

            if (layerTree.parent) {
                cssData.top = pxToRem(layerTree.coords.top - layerTree.parent.coords.top);
                cssData.left = pxToRem(layerTree.coords.left - layerTree.parent.coords.left);
            }


            const childrenTree = layerTree.children();

            if (!childrenTree.length && !layerTree.isGroup()) {

                cssData.background = `transparent url(../images/${layerId}.png) no-repeat; background-size: 100%;`
                
                const imgSrc = path.join(config.images, `${layerId}.png`);

                try {
                    await layerTree.saveAsPng(imgSrc);
                } catch (error) {
                    // console.log('[错误]: ' + layerTree.path());
                }

            }

            cssText += this.objectToCssText(`.${elementClass}`, cssData);

            for (let i = childrenTree.length - 1; i >= 0; i--) {
                const childLayerTree = childrenTree[i];
                if (childLayerTree.layer.visible) {
                    const $child = $('<div></div>');
                    $element.append($child);
                    await analysisLayer($child, childLayerTree);
                }
            }


        };

        const $app = $('<div></div>');
        $('body').append($app);
        await analysisLayer($app, this.tree);

        await fse.outputFile(config.index, $.html());
        await fse.outputFile(config.css, cssText);

    }

}

module.exports = PsdH5;
