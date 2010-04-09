// var cliController = require("command_line:controller").cliController;

var gist = require("./gist-yql");
var console = require("bespin:console").console;
exports.hello = function(env, args, request) {
    console.log(arguments);
};
/**
    Lists usre gists. 
*/
exports.list = function list(env, args, request) {
    console.log(env, args, request);
    request.async();
    gist.list({
        user: args.user,
        token: args.token
    }, function(gists) {
        request.done(gists.map(function(gist) {
            var description = gist.description;
            description = description ? " : " + description : "";
            return "<div>" + gist.repo + " ( " + gist.created_at + ")" + description + "</div>"; 
        }).join("\n"));
    }, function(error) {
        console.error("gist list", error);
    });
};