// var cliController = require("command_line:controller").cliController;
var gist = require("./gist-yql");
var console = require("bespin:console").console;
var settings = require('settings').settings;
var QuickMatcher = require('matcher:quick').QuickMatcher;
var MatcherMenu = require('command_line:views/menu').MatcherMenu;


exports.hello = function(env, args, request) {
    console.log(arguments);
};
var PRIVATE = '<img src="http://gist.github.com/images/icons/private.png" alt="private"/>';
var PUBLIC = '<img src="http://gist.github.com/images/icons/public.png" alt="public"/>';
var GIST = '<div>%@4 <a href="http://gist.github.com/%@" target="_blank">gist: %@1</a> %@ <i>%@</i></div>';
var SCHEME = "";

function credential(params) {
    var user, token;
    if (undefined !== params) {
        user = params.user
        token = params.token;
    }
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
    request.async();
    gist.list(login, function(gists) {
        console.log(gists);
        request.done(gists.map(function(gist) {
            var isPrivate = (gist["public"] === 'false') ? PRIVATE : PUBLIC;
            return GIST.fmt(gist.repo, gist.description || undefined, gist.created_at, isPrivate);
        }).join("\n"));
    }, function(result) {
        request.doneWithError(result.error);
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
    data[name] = (0 < selection.length) ? selection : buffer.model.getValue();
    var description = params.description || "bespin gist: " + name;
    var isPrivate = params['private'];
    request.async();
    gist.write(data, {
        user: login.user,
        token: login.token,
        description: description,
        'public': !isPrivate
    }, function(result) {
        request.done(GIST.fmt(result.repo, description, undefined, isPrivate ? PRIVATE : PUBLIC));
    }, function(result) {
        request.doneWithError(result.error);
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
    console.log(params);
    var login = credential(params);
    var buffer = env.get("buffer");
    request.async();
    gist.read({
        user: login.user,
        token: login.token,
        repo: params.repo.replace(SCHEME, "")
    },
    function(result) {
        buffer.set("file", null);
        try {
            var model = buffer.model;
            model.replaceCharacters(model.range(), result.content);
        } catch(e) {
            console.error(e)
        }
    }, function(result) {
        request.doneWithError(result.error);
    });
};

exports.gists = {
    getHint: function getHint(input, assignment, typeExt) {
        console.log(arguments);
        var login = credential();
        var query = assignment.value || '';
        var matcher = QuickMatcher.create({ query: query });

        var menu = MatcherMenu.create({
            input: input,
            assignment: assignment,
            typeExt: typeExt,
            matcher: matcher
        });
        gist.list(login, function(gists) {
            matcher.addItems(gists.map(function(gist) {
                return { name: SCHEME + gist.repo };
            }));
        });
        return menu.get('hint');
    }
};
