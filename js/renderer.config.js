'use strict';

/**
 * Render config object used by browser's StreamGL library to configure WebGL + streaming. Sent via
 * XHR or WebSocket to the browser by the server in response to API call.
 */

var fs = require('fs');
var _ = require('underscore');
var debug = require('debug')('graphistry:graph-viz:driver:config');
var util = require('./util.js');


var STROKE_WIDTH = 4.0;

var programs = {
    'edgeculled': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/edgeculled.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/edgeculled.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['edgeColor', 'curPos'],
        'camera': 'mvp',
        'uniforms': []
    },
    'edges': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/edge.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/edge.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['edgeColor', 'curPos'],
        'camera': 'mvp',
        'uniforms': []
    },
    'midedges': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/midedge.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/midedge.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos'],
        'camera': 'mvp',
        'uniforms': []
    },
    'midedgeculled': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/midedgeculled.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/midedgeculled.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'edgeColor'],
        'camera': 'mvp',
        'uniforms': []
    },
    'midedgetextured': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/midedge-textured.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/midedge-textured.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'aColorCoord'],
        'textures': ['uSampler'],
        'camera': 'mvp',
        'uniforms': []
    },
    'pointculled': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/pointculled.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/pointculled.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'pointSize', 'pointColor'],
        'camera': 'mvp',
        'uniforms': ['fog', 'stroke', 'zoomScalingFactor', 'maxPointSize']
    },
    'points': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/point.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/point.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'pointSize', 'pointColor'],
        'camera': 'mvp',
        'uniforms': ['zoomScalingFactor', 'maxPointSize']
    },
    'midpoints': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/midpoint.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/midpoint.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos'],
        'camera': 'mvp',
        'uniforms': []
    }
}

/* datasource can be either SERVER or CLIENT */

var textures = {
    'hitmap': {
        'datasource': 'CLIENT',
    },
    'pointTexture': {
        'datasource': 'CLIENT',
        'retina': true
    },
    'pointHitmapDownsampled': {
        'datasource': 'CLIENT',
        'width': {'unit': 'percent', 'value': 5},
        'height': {'unit': 'percent', 'value': 5}
    },
    'colorMap': {
        'datasource': 'SERVER',
        'path': 'test-colormap2.png'
    }
}


/* datasource can be
 * DEVICE -> OpenCL server buffer
 * HOST   -> plain server buffer
 * CLIENT -> computed on client
 */
var models = {
    'springsPos': {
        'curPos': {
            'datasource': 'DEVICE',
            'type': 'FLOAT',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'logicalEdges': {
        'curIdx': {
            'datasource': 'HOST',
            'type': 'UNSIGNED_INT',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'midSpringsPos': {
        'curPos': {
            'datasource': 'DEVICE',
            'type': 'FLOAT',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'midSpringsColorCoord': {
        'colorCoord': {
            'datasource': 'DEVICE',
            'type': 'FLOAT',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'curPoints': {
        'curPos': {
            'datasource': 'DEVICE',
            'type': 'FLOAT',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'pointSizes': {
        'pointSize':  {
            'datasource': 'HOST',
            'type': 'UNSIGNED_BYTE',
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'edgeColors': {
        'edgeColor':  {
            'datasource': 'HOST',
            'type': 'UNSIGNED_BYTE',
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'pointColors': {
        'pointColor':  {
            'datasource': 'HOST',
            'type': 'UNSIGNED_BYTE',
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'curMidPoints': {
        'curPos': {
            'datasource': 'DEVICE',
            'type': 'FLOAT',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'vertexIndices': {
        'pointColor': {
            'datasource': 'VERTEX_INDEX',
            'type': 'UNSIGNED_BYTE',
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'edgeIndices': {
        'edgeColor': {
            'datasource': 'EDGE_INDEX',
            'type': 'UNSIGNED_BYTE',
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    }
}

var items = {
    'edgeculled': {
        'program': 'edgeculled',
        //'trigger': 'renderScene',
        'bindings': {
            'curPos': ['springsPos', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor']
        },
        'drawType': 'LINES',
        'glOptions': {}
    },
    'edgeculledindexed' : {
        'program': 'edgeculled',
        'trigger': 'renderScene',
        'bindings': {
            'curPos': ['springsPos', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor']
        },
        'index': ['logicalEdges', 'curIdx'],
        'drawType': 'LINES',
        'glOptions': {}
    },
    'edgepicking': {
        'program': 'edges',
        'bindings': {
            'curPos': ['springsPos', 'curPos'],
            'edgeColor': ['edgeIndices', 'edgeColor']
        },
        'drawType': 'LINES',
        'glOptions': {'clearColor': [[1, 1, 1, 0.0]] },
        'renderTarget': 'hitmap',
        'readTarget': true
    },
    'edges': {
        'program': 'edges',
        'trigger': 'renderScene',
        'bindings': {
            'curPos': ['springsPos', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor']
        },
        'drawType': 'LINES',
        'glOptions': {}
    },
    'pointculled': {
        'program': 'pointculled',
        'trigger': 'renderScene',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor'],
        },
        'uniforms': {
            'fog': { 'uniformType': '1f', 'defaultValues': [10.0] },
            'stroke': { 'uniformType': '1f', 'defaultValues': [-STROKE_WIDTH] },
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {},
    },
    'uberpointculled': {
        'program': 'pointculled',
        'trigger': 'renderScene',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor'],
        },
        'uniforms': {
            'fog': { 'uniformType': '1f', 'defaultValues': [10.0] },
            'stroke': { 'uniformType': '1f', 'defaultValues': [-STROKE_WIDTH] },
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [8.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {},
    },
    'pointculledtexture': {
        'program': 'pointculled',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor']
        },
        'uniforms': {
            'fog': { 'uniformType': '1f', 'defaultValues': [10.0] },
            'stroke': { 'uniformType': '1f', 'defaultValues': [-STROKE_WIDTH] },
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {'clearColor': [[1, 1, 1, 0.0]] },
        'renderTarget': 'pointTexture',
        'readTarget': true,
    },
    'pointoutline': {
        'program': 'pointculled',
        'trigger': 'renderScene',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor']
        },
        'uniforms': {
            'fog': { 'uniformType': '1f', 'defaultValues': [10.0] },
            'stroke': { 'uniformType': '1f', 'defaultValues': [STROKE_WIDTH] },
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {},
    },
    'pointoutlinetexture': {
        'program': 'pointculled',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor'],
        },
        'uniforms': {
            'fog': { 'uniformType': '1f', 'defaultValues': [10.0] },
            'stroke': { 'uniformType': '1f', 'defaultValues': [STROKE_WIDTH] },
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {'clearColor': [[1, 1, 1, 0.0]] },
        'renderTarget': 'pointTexture',
        'readTarget': false
    },
    'pointpicking': {
        'program': 'points',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['vertexIndices', 'pointColor']
        },
        'uniforms': {
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {'clearColor': [[1, 1, 1, 0.0]] },
        'renderTarget': 'hitmap',
        'readTarget': true,
    },
    'pointsampling': {
        'program': 'points',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['vertexIndices', 'pointColor']
        },
        'uniforms': {
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {'clearColor': [[1, 1, 1, 0.0]] },
        'renderTarget': 'pointHitmapDownsampled',
        'readTarget': true,
    },
    'points': {
        'program': 'points',
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor']
        },
        'uniforms': {
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0]},
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {}
    },
    'midpoints': {
        'program': 'midpoints',
        'trigger': 'renderScene',
        'bindings': {
            'curPos': ['curMidPoints', 'curPos']
        },
        'drawType': 'POINTS',
        'glOptions': {}
    },
    'midedgetextured': {
        'program': 'midedgetextured',
        'trigger': 'renderScene',
        'bindings': {
            'curPos': ['midSpringsPos', 'curPos'],
            'aColorCoord': ['midSpringsColorCoord', 'colorCoord']
        },
        'textureBindings': {
            'uSampler': 'colorMap'
        },
        'drawType': 'LINES',
        'glOptions': {}
    },
    'midedgeculled': {
        'program': 'midedgeculled',
        'trigger': 'renderScene',
        'bindings': {
            'curPos': ['midSpringsPos', 'curPos'],
            'edgeColor' : ['edgeColors', 'edgeColor']
        },
        'drawType': 'LINES',
        'glOptions': {}
    }
}

var stdOptions = {
    'enable': [['BLEND'], ['DEPTH_TEST']],
    'disable': [['CULL_FACE']],
    'blendFuncSeparate': [['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ONE']],
    'blendEquationSeparate': [['FUNC_ADD', 'FUNC_ADD']],
    'depthFunc': [['LEQUAL']],
    'clearColor': [[1, 1, 1, 0.0]],
    'lineWidth': [[1]]
}

var camera2D = {
    'type': '2d',
    //'bounds': 'CANVAS', // Use runtime dimensions of canvas element
    'bounds': {'top': -1, 'left': 0, 'bottom': 0, 'right': 1},
    'nearPlane': -1,
    'farPlane': 10
}

var sceneUber = {
    'options': stdOptions,
    'camera': camera2D,
    'render': ['pointpicking',  'pointsampling', 'midedgetextured', 'edgepicking', 'uberpointculled']
}

var sceneNetflow = {
    'options': stdOptions,
    'camera': camera2D,
    'render': ['pointpicking', 'pointsampling', 'pointculledtexture', 'pointoutlinetexture',
               'edgeculled', 'edgepicking', 'pointoutline', 'pointculled']
}

var scenes = {
    'default': sceneNetflow,
    'uber' : sceneUber,
    'netflow': sceneNetflow
}

function saneProgram(program, progName) {
    _.each(['sources', 'attributes', 'camera', 'uniforms'], function (field) {
        if (!(field in program))
            util.die('Program "%s" must have field "%s"', progName, field);
    });
}

function saneTexture(texture, texName) {
    _.each(['datasource'], function (field) {
        if (!(field in texture))
            util.die('Texture "%s" must have field "%s"', texName, field);
    });
}

function saneModel(model, modName) {
    _.each(model, function (buffer, bufName) {
        _.each(['datasource', 'type', 'count', 'offset', 'stride', 'normalize'], function (field) {
            if (!(field in buffer))
                util.die('Buffer "%s" in model "%s" must have field "%s"', bufName, modName, field);
        });
    });
}

function saneItem(programs, textures, models, item, itemName) {
    _.each(['program', 'bindings', 'drawType', 'glOptions'], function (field) {
        if (!(field in item))
            util.die('Item "%s" must have field "%s"', itemName, field);
    });

    if ('renderTarget' in item)
        if (!('readTarget' in item))
            util.die('Item "%s" must specify readTarget with renderTarget', itemName);

    var progName = item.program;
    if (!(progName in programs))
        util.die('In item "%s", undeclared program "%s"', itemName, progName);
    var program = programs[progName];

    if (program.textures) {
        _.each(program.textures, function (texName){
            if (!item.textureBindings)
                util.die('Item "%s", must have textureBindings for program "%s"',
                        itemName, progName);
            if (!_.contains(_.keys(item.textureBindings), texName))
                util.die('In item "%s", no bindings for texture "%s" (of program "%s")',
                        itemName, texName, progName);
        });
        _.each(item.textureBindings, function (texName, texPname) {
            if (!_.contains(program.textures, texPname))
                util.die('Program "%s" does not declare texture named "%s" bound by item "%s"',
                        progName, texPname, itemName);
            if (!(texName in textures))
                util.die('In item "%s", undeclared texture "%s"', itemName, texName);
        });
    }

    _.each(program.uniforms, function (uniform) {
        if (!(item.uniforms) || !(uniform in item.uniforms))
            util.die('Item "%s" does not bind uniform "%s"', itemName, uniform);
    });

    _.each(item.uniforms, function (binding, uniform) {
        if (!_.contains(program.uniforms, uniform))
            util.die('Item "%s" binds uniform "%s" not declared by program "%s"',
                     itemName, uniform, progName)
    })

    _.each(program.attributes, function (attr) {
        if (!(attr in item.bindings))
            util.die('In item "%s", program attribute "%s" (of program "%s") is not bound',
                    itemName, progName, attr);
    });
    _.each(item.bindings, function (modelNames, attr) {
        if (!_.contains(program.attributes, attr))
            util.die('Program %s does not declare attribute %s bound by item %s',
                        progName, attr, itemName);
        if (!(modelNames[0] in models) || !(modelNames[1] in models[modelNames[0]]))
            util.die('In item "%s", undeclared model "%s"', itemName, modelNames);
    });

    if (item.renderTarget) {
        var texName = item.renderTarget;
        if (!_.contains(_.keys(textures), texName))
            util.die('In item "%s", underclared renderTarget texture "%s"', itemName, texName);
    }
}

function saneScene(items, scene, sceneName) {
    _.each(['options', 'camera', 'render'], function (field) {
        if (!(field in scene))
            util.die('Scene "%s", must have field "%s"', sceneName, field);
    });

    _.each(scene.render, function (itemName) {
        if (!(itemName in items))
            util.die('In scene "%s", undeclared render item "%s"', sceneName, itemName);
    });
}

function check(programs, textures, models, items, scenes) {
    _.each(programs, saneProgram);
    _.each(textures, saneTexture);
    _.each(models, saneModel);
    _.each(items, saneItem.bind('', programs, textures, models));
    _.each(scenes, saneScene.bind('', items));
}

function generateAllConfigs(programs, textures, models, items, scenes) {
    check(programs, textures, models, items, scenes);

    return _.object(_.map(scenes, function (scene, name) {
        var config = {};

        var citems = {}
        var cprograms = {};
        var cmodels = {};
        var ctextures = {};

        _.each(scene.render, function (itemName) {
            var item = items[itemName];
            citems[itemName] = item;

            var progName = item.program;
            var program = programs[progName];
            cprograms[progName] = program;

            if (program.textures) {
                _.each(item.textureBindings, function (texName, texPname) {
                    ctextures[texName] = textures[texName];
                })
            }

            _.each(item.bindings, function (modelNames, attr) {
                var model = models[modelNames[0]][modelNames[1]];
                var wrapper = {};
                wrapper[modelNames[1]] = model;
                cmodels[modelNames[0]] = wrapper;
            })

            if (item.index) {
                var modelNames = item.index;
                var model = models[modelNames[0]][modelNames[1]];
                var wrapper = {};
                wrapper[modelNames[1]] = model;
                cmodels[modelNames[0]] = wrapper;
            }

            if (item.renderTarget) {
                ctextures[item.renderTarget] = textures[item.renderTarget];
            }
        });

        config.options = scene.options;
        config.camera = scene.camera;
        config.render = scene.render;
        config.programs = cprograms;
        config.items = citems;
        config.textures = ctextures;
        config.models = cmodels;

        //debug('Config generated for %s: %s', name, JSON.stringify(config, null, 4));

        return [name, config];
    }));
}

function gl2Bytes(type) {
    var types = {
        'FLOAT': 4,
        'UNSIGNED_BYTE': 1
    };
    if (!(type in types))
        util.die('Unknown GL type "%s"', type);
    return types[type];
}

function isBufClientSide(buf) {
    var datasource = _.values(buf)[0].datasource;
    return (datasource == 'CLIENT' || datasource == 'VERTEX_INDEX' || datasource == "EDGE_INDEX");
}

function isBufServerSide(buf) {
    var datasource = _.values(buf)[0].datasource;
    return (datasource == 'HOST' || datasource == 'DEVICE');
}

module.exports = {
    'scenes': generateAllConfigs(programs, textures, models, items, scenes),
    'gl2Bytes': gl2Bytes,
    'isBufClientSide': isBufClientSide,
    'isBufServerSide': isBufServerSide
};
