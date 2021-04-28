var XHR = function XHR() {
  var _xhr = this;

  _xhr.get = function (url) {
    var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var xhr = _xhr.init(url, args);

    return xhr;
  };

  _xhr.init = function (url) {
    var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    args = _xhr.setArgDefaults(args);
    var xhr = new XMLHttpRequest();
    xhr.open(args.method, url, args.async);

    _xhr.__setEvents(xhr, args);

    _xhr.__setCallbackChains(xhr);

    for (var k in args) {
      xhr[k] = args[k];
    }

    return xhr;
  };

  _xhr.argDefaults = {
    method: 'GET',
    async: true,
    responseType: 'text'
  };

  _xhr.setArgDefaults = function () {
    var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    for (var k in _xhr.argDefaults) {
      args[k] = args[k] || _xhr.argDefaults[k];
    }

    return args;
  };

  var events = ['abort', 'error', 'load', 'loadend', 'loadstart', 'progress', 'timeout'];
  /* If args contains events, e.g.: 'load', 'onload', 'onerror', 'progress'
      This will add an event listener for the relevant event.
  */

  _xhr.__setEvents = function (xhr) {
    var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    events.forEach(e => {
      var ev = args[e] || args['on' + e];

      if (ev) {
        xhr.addEventListener(e, e => ev(e));
      }
    });
    return xhr;
  };
  /* Allows for handling callbacks with function chaining. Also makes xhr a 
      'thennable' interface.
      example:
      xhr.get(url)
          .then(response => { ... })
          .error(err => { ... }) 
  */


  _xhr.__setCallbackChains = function (xhr) {
    xhr.load = function (onLoad) {
      xhr.addEventListener('load', r => onLoad(xhr.response));
      xhr.send();
      return xhr;
    };

    xhr.error = function (onError) {
      xhr.addEventListener('error', onError);
      return xhr;
    };

    xhr.then = xhr.load;
    xhr.catch = xhr.error;
    return xhr;
  };

  return _xhr;
};
new XHR();

var Router = function Router() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var router = this;
  router.paths = [// { pattern : /./, value : '' }
  ];
  /* User supplied. Executes when the window.location.hash changes 
      hash: the window.location.hash value 
      value: The value of the first router path to match the hash.
          Null if no path match
      args: URLSearchParams in object form. 
          example: ?key1=val1&key2=val2 gets converted to { key1 : val1, key2 : val2 }
  */

  var onHashChange = function onHashChange(hash, pathValue, args) {};

  Object.defineProperty(router, 'onHashChange', {
    get: function get() {
      return onHashChange;
    },
    set: function set(val) {
      onHashChange = val;
      window.onhashchange = router.__onHashChange;
    }
  });

  router.__onHashChange = function () {
    var hash = location.hash || '#';
    var path = router.paths.find(path => {
      return path.pattern.test(hash);
    });
    var value = path ? path.value : null;
    var searchParams = router.getSearchParams();
    onHashChange(hash, value, searchParams);
  };

  router.onHashChange = options.onHashChange || onHashChange;

  router.getSearchParams = function () {
    var search = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : location.search;

    if (!search) {
      search = /\?.+$/.exec(location.hash);

      if (search) {
        search = search[0];
      }
    }

    if (!search) {
      return;
    }

    search = search.replace('&amp;', '&');
    var params = new URLSearchParams(search);
    var objParams = {};

    for (var k of params.keys()) {
      objParams[k] = params.get(k);
    }

    return objParams;
  };
  /*
      path : { hash : '', value : any }
  */


  router.addPath = function (path) {
    if (path.hash instanceof RegExp) {
      path.pattern = path.hash;
      router.paths.push(path);
    }

    if (typeof path.hash !== 'string') {
      return;
    }

    path.pattern = router.getHashRegex(path.hash);
    router.paths.push(path);
    return router.paths;
  };

  var escapeSpecialChars = function escapeSpecialChars(hash) {
    ['(', ')'].forEach(specialChar => {
      hash = hash.replace(specialChar, '\\' + specialChar);
    });
    return hash;
  };

  var escapeWildCard = function escapeWildCard(hash) {
    return hash.replace(/{.+}/, '.+');
  };

  router.getHashRegex = function (hash) {
    hash = escapeWildCard(hash);
    hash = escapeSpecialChars(hash);
    /* hash to match #location/hash
        with ?optional=true&parameters=1*/

    var pattern = new RegExp('^\#' + hash + '(\\?.*)?$');
    return pattern;
  };
  /*
      paths = [path, path]
  */


  router.addPaths = function (paths) {
    for (var p in paths) {
      router.addPath(paths[p]);
    }

    return router.paths;
  };

  if (options.paths) {
    router.addPaths(options.paths);
  }

  return router;
};

var Lite = function Lite() {
  var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var _lite = this;

  _lite.xhr = new XHR();
  Lite.prototype.Router = Router;
  _lite.container;
  _lite.contentUrl = '';

  _lite.initialize = () => {};

  _lite.content = null;

  _lite.onContentLoaded = c => {};

  _lite.onContentBound = c => {};

  _lite.data = null;

  _lite.onDataBound = d => {};
  /* setContent
      Explicitly kick off the content loading and binding process
  */


  _lite.setContent = function (content) {
    _lite.content = content;

    _lite.onContentLoaded(_lite.content);

    if (typeof _lite.container === 'string') {
      _lite.container = document.getElementById(_lite.container);
    }

    if (_lite.container) {
      _lite._bindContent(_lite.content);
    }
  };
  /* Attach
      Kicks off the view lifecycle of loading and binding. 
  */


  _lite.attach = function (container) {
    if (container) {
      _lite.container = container;
    }

    _lite._loadContent();
  };

  _lite._loadContent = function () {
    if (_lite.contentUrl) {
      return _lite.xhr.get(_lite.contentUrl).then(r => _lite.setContent(r)).catch(e => {
        throw 'Error when fetching resource ' + _lite.contentUrl;
      });
    } else if (_lite.content) {
      return _lite.setContent(_lite.content);
    }
  };

  _lite._bindContent = function () {
    if (_lite.container && _lite.content) {
      while (_lite.container.firstChild) {
        _lite.container.removeChild(_lite.container.firstChild);
      }

      _lite.container.insertAdjacentHTML('afterbegin', _lite.content);

      _lite.onContentBound(_lite.content);

      if (_lite.data) {
        _lite.bindData();
      }
    } else {
      throw new Error("no container or no content for template");
    }
  };

  _lite.bindData = function (data) {
    data = data || _lite.data;

    _lite.container.querySelectorAll('[data-field]').forEach(el => {
      var prop = el.getAttribute('data-field') || el.id;
      var val = prop.split('.').reduce((acc, p) => {
        return acc[p];
      }, data);

      if (typeof el.value !== 'undefined') {
        el.value = val;
      } else el.innerHTML = val;
    });

    _lite.onDataBound(data);
  };

  _lite.loadStyleSheet = function (uri) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.type = 'text/css';
    css.href = uri;
    var links = document.getElementsByTagName('link');
    var hasLink = Array.from(links).some(link => {
      return link.href == css.href;
    });

    if (hasLink) {
      return;
    }

    var head = document.getElementsByTagName('head')[0];
    head.appendChild(css);
  };

  _lite.loadScript = function (uri) {
    var script = document.createElement('script');
    script.src = uri;
    var scripts = document.getElementsByTagName('script');
    var hasScript = Array.from(scripts).some(s => {
      return s.src == script.src;
    });

    if (hasScript) {
      return;
    }

    var head = document.getElementsByTagName('head')[0];
    head.appendChild(script);
  };
  /* When Lite or any derived class is instantiated, the args 
  can add to it or override its defaults. */


  for (var a in args) {
    this[a] = args[a];
  }
  /* extend 
      Creates a base class. args passed in will be propagated to all 
      instances of the new class. */


  _lite.extend = function (args) {
    return function (more_args) {
      for (var k in more_args) {
        args[k] = more_args[k];
      }

      Lite.call(this, args);
    };
  };
  /* Call .initialize as the last thing we do as part of instantiation */


  _lite.initialize.bind(_lite)();
};
var lite = new Lite();

export { Lite, lite };
