function encode(data) {
    var message = "";
    for (var key in data) {
        message += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
    }
    return message.substring(1);
}
function request(options) {
    var result = {};
    var xhr = new XMLHttpRequest();
    var url = options.url;
    var data = options.data;
    var message = null;
    if (data) message = encode(data);
    var method = null;
    var headers = options.headers || {};
    if ("POST" == (method = options.method)) {
        if (!headers["Content-type"]) headers["Content-type"] = "application/x-www-form-urlencoded";
    } else {
        method = "GET";
        url += "?" + message;
        message = null;
    }
    var success = options.success;
    var error = options.error;
    xhr.open(method, url, !!(success));
    if (headers) for (var key in headers) xhr.setRequestHeader(key, headers[key]);
    xhr.onreadystatechange = function xhrState() {
        if (xhr.readyState == 4) {
            if (xhr.status == 0 || xhr.status == 200) {
                var text = result.text = xhr.responseText;
                result.xml = xhr.responseXML;
                if(success) success(result);
            } else if (error) {
                error(xhr)
            }
        }
    }
    xhr.send(message);
    return result;
};

/**
 * writes files as gists
 * @param {JSON} files       hashmap of file name > content
 * @param {JSON} options     has to have properties user, token and optional isPrivate
 */
var write = exports.write = function write(files, options, success, error) {
    var result = {};
    var data = {
        login: options.user,
        token: options.token
    };
    if (options.isPrivate)  data.action_button = "private";
    var count = 0;
    for (var name in files) {
        if (count ++ > 10) break;
        var key = "gistfile" + count;
        data["file_name[" + key + "]"] = name;
        data["file_ext[" + key + "]"] = undefined;
        data["file_contents[" + key + "]"] = files[name];
    }
    request({
        url: "http://gist.github.com/gists/",
        method: "POST",
        headers: { "Accept": "text/javascript, text/json" },
        data: data,
        success: function success(response) {
            result.id =  /gist: (\w*) /.exec(response.text)[1];
            if (success) success(result)
        },
        error: function requestError(response) {
            result.error = response;
            if (error) error(failure);
        }
    });
    return result;
};
/**
 * removes gist
 * @param {String} id           unique gist id
 * @param {String} options      has to have properties user, token
 */
var remove = exports.remove = function remove(id, options, success, error) {
    var result = {};
    return request({
        url: "https://gist.github.com/delete/" + id,
        method: "POST",
        headers: { "Accept": "text/javascript, text/json" },
        data: {
            "login": options.user,
            "token": options.token,
            "_method": "delete"
        },
        success: function requestSuccess() {
            result.removed = true;
            if (success) success(result);
        },
        error: function requestError(response) {
            result.removed = false;
            result.error = response;
            if (error) error(result);
        }
    });
    return result;
};
var user = exports.user = function user(options, success, error) {
    var result = {};
    request({
        url: "https://github.com/api/v2/json/user/show/" + options.user,
        //url: "http://github.com/api/v1/json/" + options.user,
        method: "POST",
        headers: { "Accept": "text/javascript, text/json" },
        data: {
            "login": options.user,
            "token": options.token
        },
        success: function requestSuccess(response) {
            var data = JSON.parse(response.text);
            for (var key in data) {
                result[key] = data[key];
            }
            if (success) success(result);
        },
        error: function requestError(response) {
            result.error = response;
            if (error) error(result);
        }
    });
    return result;
};

var edit = exports.edit = function edit(id, options, success, error) {
    result = {};
    return request({
        url: "https://gist.github.com/gists/" + id + "/edit/",
        headers: { "Accept": "text/javascript, text/json" },
        data: {
            login: options.user,
            token: options.token
        },
        success: function requestSuccess(response) {
            result.hash = response.text.match(/<form[^>]*action="\/gists\/(\d*)"[^>]*method="post"/)[1];
            if (success) success(result);
        },
        error: function requestError(response) {
            result.error = response;
            if (error) error(result)
        }
    });
    return result;
};

var description = exports.description = function description(text, options, success, error) {
    var result = {};
    request({
        url: "https://gist.github.com/gists/" + options.id + "/update_description",
        method: "POST",
        headers: { "Accept": "text/javascript, text/json" },
        data: {
            login: options.user,
            token: options.token,
            description: text
        },
        success: function requestSuccess() {
            result.updated = true;
            if (success) success(result);
        },
        error: function requestError(response) {
            result.updated = false;
            result.error = response;
            if (error) error(result);
        }
    });
    return result;
};

var update = exports.update = function update(files, text, options, success, error) {
    var tasts = (files && text) ? 2 : 1;
    var result = {};
    function callback() { if (0 == --tasks && success) success(result); }
    if (text) description(text, options, callback, error);
    if (files) {
        var data = {
            login: options.user,
            token: options.token,
            _method: "put"
        };
        for (var name in files) {
            data["file_name[" + name + "]"] = name;
            data["file_ext[" + name + "]"] = name.substr(name.lastIndexOf("."));
            var content = files[name];
            if (content !== null) data["file_contents[" + name + "]"] = content;
        }
        edit(options.id, options, function hashReceived(response) {
            request({
                url: "https://gist.github.com/gists/" + response.hash,
                headers: { "Accept": "text/javascript, text/json" },
                method: "POST",
                data: data,
                success: callback,
                error: error
            });
        }, error);
    }
    return result;
};

var list = exports.list = function list(options, success, error) {
    var match = /file\s*(private|public)[\s\S]*?gist:\s*(\w*)[\s\S]*?<span[^>]*>(\w*)/g;
    var result = [], index = 1;
    var token = options.token, data = { "login": options.user };
    if (token) data.token = token;

    function fetch(index) {
        if (index) data.page = index;
        request({
            url: "http://gist.github.com/mine/",
            method: "POST",
            headres: { "Accept": "text/javascript, text/json" },
            data: data,
            success: collect,
            error: error
        });
    }

    function collect(response) {
        var gist, found;
        while (gist = match.exec(response.text)) {
            found = true;
            result.push({
                id: gist[2],
                description: gist[3],
                isPrivate: (gist[1] == "private")
            });
        }
        if (found) fetch(++ index);
        else if (success) success(result);
    }

    fetch(index);
    return result;
};

var read = exports.read = function read(id, options, success, error) {
    var result = {};
    request({
        url: "https://gist.github.com/" + id + ".txt",
        method: "POST",
        data: options,
        success: function requestSuccess(response) {
            result.text = response.text;
            if (success) success(result);
        },
        error: function requestError(response) {
            result.error = response;
            if (error) error(result);
        }
    });
    return result;
}