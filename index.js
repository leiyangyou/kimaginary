'use strict';

var app = require('koa')();
var router = require('koa-router')();
var Sharp = require('sharp');
var Color = require('color');
var getRawBody = require('raw-body');
var logger = require('koa-logger');
var cluster = require('cluster');


function parseColor(c, o) {
  return Color("rgb(" + c + ")").alpha(parseFloat(o));
}

router.post('/watermark', function *(next) {
  var body = yield getRawBody(this.req, {encoding: false});
  var qs = this.query;
  this.body = Sharp(new Buffer(body)).
    maskWithColor(parseColor(qs.mask, qs.maskopacity)).
    watermark({
      color: parseColor(qs.color, qs.opacity),
      text: qs.text,
      textWidth: qs.textwidth,
      font: qs.font,
      lineSpacing: qs.linespacing,
      dpi: qs.dpi
    });
  this.status = 200;
  yield next;
});

if (cluster.isMaster) {
  var numCPUs = require('os').cpus().length;

  for (var i = 0; i < numCPUs; i++) {
    var worker = cluster.fork();
  }

  cluster.on('exit', function(worker) {
    cluster.fork();
  });
} else {
  app
    .use(logger())
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(8088);
}

