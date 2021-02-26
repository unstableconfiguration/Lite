let XHR = function() { 
    let _xhr = this;

    _xhr.get = function(url, args = {}) { 
        let xhr = _xhr.init(url, args);
        return xhr;
    };

    _xhr.init = function(url, args = {}) {
        args = _xhr.setArgDefaults(args);

        let xhr = new XMLHttpRequest();
        xhr.open(args.method, url, args.async);

        _xhr.__setEvents(xhr, args);
        _xhr.__setCallbackChains(xhr);
        for(let k in args) { 
            xhr[k] = args[k];
        }
        return xhr;
    };

    _xhr.argDefaults = { 
        method : 'GET',
        async : true,
        responseType : 'text'
    };

    _xhr.setArgDefaults = function(args = {}) {
        for(let k in _xhr.argDefaults) { 
            args[k] = args[k] || _xhr.argDefaults[k];
        }
        return args;
    };

    let events = [ 
        'abort', 'error', 'load', 'loadend', 'loadstart', 'progress', 'timeout'
    ];

    /* If args contains events, e.g.: 'load', 'onload', 'onerror', 'progress'
        This will add an event listener for the relevant event.
    */
    _xhr.__setEvents = function(xhr, args = {}) { 
        events.forEach(e => { 
            let ev = args[e] || args['on' + e];
            if(ev) { 
                xhr.addEventListener(e, (e) => ev(e));
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
    _xhr.__setCallbackChains = function(xhr) { 
        xhr.load = function(onLoad) {
            xhr.addEventListener('load', (r) => onLoad(xhr.response));
            xhr.send();
            return xhr;
        };

        xhr.error = function(onError) { 
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

let Router = function(options = {}) { 
    let router = this;
    router.paths = [
        // { pattern : /./, value : '' }
    ];

    /* User supplied. Executes when the window.location.hash changes 
        hash: the window.location.hash value 
        value: The value of the first router path to match the hash.
            Null if no path match
        args: URLSearchParams in object form. 
            example: ?key1=val1&key2=val2 gets converted to { key1 : val1, key2 : val2 }
    */
    let onHashChange = function(hash, pathValue, args) { };
    Object.defineProperty(router, 'onHashChange', {
        get : function() { return onHashChange; },
        set : function(val) { 
            onHashChange = val;
            window.onhashchange = router.__onHashChange;
        }
    });

    router.__onHashChange = function() { 
        let hash = location.hash || '#';
        
        let path = router.paths.find(path => {
            return path.pattern.test(hash);
        });        
        let value = path ? path.value : null;

        let search = /\?.+$/.exec(hash);
        search = search ? search[0] : location.search;
        let urlArgs = router.getSearchParams(search);
        
        onHashChange(hash, value, urlArgs);
    };
    router.onHashChange = options.onHashChange || onHashChange;
    

    router.getSearchParams = function(search) { 
        if(!search) { return null; }

        let params = new URLSearchParams(search);
        
        let objParams = {};
        for(const k of params.keys()) {
            objParams[k] = params.get(k);
        }
        
        return objParams;
    };

    /*
        path : { hash : '', value : any }
    */
    router.addPath = function(path) {
        if(path.hash instanceof RegExp) { 
            router.paths.push({ pattern : path.hash, value : path.value });
        }
        if(typeof(path.hash) !== 'string') { return; }
        let pattern = router.getHashRegex(path.hash);
        router.paths.push({ pattern : pattern, value : path.value });
        return router.paths;
    };

    router.getHashRegex = function(hash) { 
        hash = hash.replace(/{.+}/, '.+');
        hash = hash.replace('/', '\/');
        /* hash to match #location/hash
            with ?optional=true&parameters=1*/
        let pattern = new RegExp('^\#' + hash + '(\\?.*)?$');
        return pattern;
    };

    /*
        paths = [path, path]
    */
    router.addPaths = function(paths) { 
        for(let p in paths) {
            router.addPath(paths[p]);
        }
        return router.paths;
    };

    if(options.paths) { router.addPaths(options.paths); }
    return router;
};

let Lite = function(args={}){
    let _lite = this;
    _lite.xhr = new XHR();
    Lite.prototype.Router = Router;

    _lite.container;
    _lite.contentUrl = '';

    _lite.initialize = () => {};
    _lite.content = null;
    _lite.onContentLoaded = ((c) => {});
    _lite.onContentBound = ((c) => {}); 
    
    _lite.data = null;
    _lite.onDataBound = ((d) => {});

    /* setContent
        Explicitly kick off the content loading and binding process
    */
    _lite.setContent = function(content) {
        _lite.content = content;
        _lite.onContentLoaded(_lite.content);
        if(_lite.container) { 
            _lite._bindContent(_lite.content); 
            _lite.__isContentBound = true;
        }
        if(_lite.__isDataSet) { _lite.bindData(_lite.data); }
    };

    /* setData
        Explicitly kick off the data loading and binding process
    */
    _lite.setData = function(data) { 
        _lite.data = data;
        _lite.__isDataSet = true;
        if(_lite.__isContentBound) { _lite.bindData(_lite.data); }
    };
   
    /* Attach
        Kicks off the view lifecycle of loading and binding. 
    */
    _lite.attach = function(container) {
        if(container) { _lite.container = container; }
        if(_lite.data) { _lite.setData(_lite.data); }
        
        _lite._loadContent();
    };

    _lite._loadContent = function() { 
        if(_lite.contentUrl) {
            return _lite.xhr.get(_lite.contentUrl)
                .then(r => _lite.setContent(r))
                .catch(e => { 
                    throw('Error when fetching resource ' + _lite.contentUrl);
                });
        }
        else if (_lite.content) { return _lite.setContent(_lite.content); }
    };

    _lite._bindContent = function(){
        if(_lite.container && _lite.content){
            while(_lite.container.firstChild)
                _lite.container.removeChild(_lite.container.firstChild);
            _lite.container.insertAdjacentHTML('afterbegin', _lite.content);
            _lite.onContentBound(_lite.content);
        }
        else { throw(new Error(`no container or no content for template`)); }
    };
    
    _lite.bindData = function(data) {
        _lite.container.querySelectorAll('[data-field]')
            .forEach((el)=>{
                let prop = el.getAttribute('data-field') || el.id;
                let val = prop.split('.').reduce((acc, p)=>{ return acc[p]; }, data);
                if(typeof(el.value) !== 'undefined') el.value = val;
                else el.innerHTML = val;
            });

        _lite.onDataBound(data);
    };

    _lite.loadStyleSheet = function(uri) {
        let css = document.createElement('link');
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.href = uri;
       
        let links = document.getElementsByTagName('link');
        let hasLink = Array.from(links).some((link) => { 
            return link.href == css.href;
        });
        if(hasLink) { return; }
  
        let head = document.getElementsByTagName('head')[0];
        head.appendChild(css);
    };

    _lite.loadScript = function(uri) {
        let script = document.createElement('script');
        script.src = uri;

        let scripts = document.getElementsByTagName('script');
        let hasScript = Array.from(scripts).some((s) => {
            return s.src == script.src;
        });
        if(hasScript) { return; }

        let head = document.getElementsByTagName('head')[0];
        head.appendChild(script);
    };

    /* When Lite or any derived class is instantiated, the args 
    can add to it or override its defaults. */
    for(let a in args) { this[a] = args[a]; }

    /* extend 
        Creates a base class. args passed in will be propagated to all 
        instances of the new class. */
    _lite.extend = function(args){
        return function(more_args) { 
            for(let k in more_args)
                args[k] = more_args[k];
            Lite.call(this, args);
        }
    };

    /* Call .initialize as the last thing we do as part of instantiation */
    _lite.initialize.bind(_lite)();
};

let lite = new Lite();

export { Lite, lite };
