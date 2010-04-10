// var cliController = require("command_line:controller").cliController;
var gist = require("./gist-yql");
var console = require("bespin:console").console;
var settings = require('settings').settings;

exports.hello = function(env, args, request) {
    console.log(arguments);
};
var PRIVATE = '<img src="http://gist.github.com/images/icons/private.png" alt="private"/>';
var GIST = '<div>%@4 <a href="http://gist.github.com/%@" target="_blank">%@1</a> %@ <i>%@</i></div>';

function credential(params) {
    var user = params.user, token = params.token;
    if (undefined === user) {
        user = settings.get('github-user');
        token = settings.get('github-token');
    }
    return {
        user: user,
        token: token
    };
}
/**
    Lists user gists. 
*/
exports.list = function list(env, params, request) {
    var login = credential(params);
    console.log(env, params, request);
    request.async();
    gist.list(login, function(gists) {
        console.log(gists);
        request.done(gists.map(function(gist) {
            var isPrivate = (gist["public"] === 'false') ? PRIVATE : undefined;
            return GIST.fmt(gist.repo, gist.description || undefined, gist.created_at, isPrivate);
        }).join("\n"));
    }, function(error) {
        console.error("gist list", error);
        request.doneWithError(error.toString());
    });
};
/**
    Creates gist out of the selection / buffer. 
*/
exports.create = function create(env, params, request) {
    var login = credential(params);
    var data = {};
    var view = env.get('view');
    var buffer = env.get("buffer");
    var file = buffer.get('file');
    var name = (null === file) ? "gist" : file.path;
    var selection = view.getSelectedCharacters();
    data[name] = (0 < selection.length) ? selection : buffer.model.get("value");
    var description = params.description || "bespin gist: " + name;
    var isPrivate = params['private'];
    request.async();
    gist.write(data, {
        user: login.user,
        token: login.token,
        description: description,
        'public': !isPrivate
    }, function(result) {
        request.done(GIST.fmt(result.repo, description, undefined, isPrivate ? PRIVATE : undefined));
    }, function(result) {
        request.doneWithError(result.error.description);
    });
};
/*
*/
exports.remove = function remove(env, params, request) {
};
/*
*/
exports.update = function update(env, params, request) {
    
};
/*
*/
exports.open = function open(env, params, request) {
    
};