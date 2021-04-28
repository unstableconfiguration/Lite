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

let xhr = new XHR();

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

        let searchParams = router.getSearchParams();
        
        onHashChange(hash, value, searchParams);
    };
    router.onHashChange = options.onHashChange || onHashChange;
    
    

    router.getSearchParams = function(search = location.search) { 
        if(!search) {
            search = /\?.+$/.exec(location.hash);
            if(search) { search = search[0]; }
        }
        if(!search) { return; }
        search = search.replace('&amp;', '&');

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
            path.pattern = path.hash;
            router.paths.push(path);
        }
        if(typeof(path.hash) !== 'string') { return; }
        path.pattern = router.getHashRegex(path.hash);
        router.paths.push(path);
        return router.paths;
    };

    const escapeSpecialChars = function(hash) {
        ['(', ')']
            .forEach(specialChar => {
                hash = hash.replace(specialChar, '\\' + specialChar);
            });
        return hash;
    };

    const escapeWildCard = function(hash) { 
        return hash.replace(/{.+}/, '.+');
    };

    router.getHashRegex = function(hash) {
        hash = escapeWildCard(hash);
        hash = escapeSpecialChars(hash);
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
        if(typeof(_lite.container) === 'string') {
            _lite.container = document.getElementById(_lite.container);
        }
        if(_lite.container) { 
            _lite._bindContent(_lite.content); 
        }
    };

    /* Attach
        Kicks off the view lifecycle of loading and binding. 
    */
    _lite.attach = function(container) {
        if(container) { _lite.container = container; }
        
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

            if(_lite.data) { _lite.bindData(); }
        }
        else { throw(new Error(`no container or no content for template`)); }
    };
    
    _lite.bindData = function(data) {
        data = data || _lite.data;
        _lite.container.querySelectorAll('[data-field]')
            .forEach((el)=>{
                let prop = el.getAttribute('data-field') || el.id;
                let val = prop.split('.').reduce((acc, p) => { return acc[p]; }, data);
                if(typeof(el.value) !== 'undefined') { el.value = val; }
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

let LiteTests = function() { 
    let assert = chai.assert;

    describe('Lite Tests', function() { 

        describe('View Lifecycle', function() {
            it('should execute provided initialize() function when initialized', function() {
                let isInitialized = false;
                let view = lite.extend({
                    initialize : function() { isInitialized = true; }
                });
                view = new view();
                assert(isInitialized);
            });

            it('should execute onContentLoaded() and onContentBound() in order when attached to container', function(done) {
                let view = lite.extend({
                    content : 1,
                    onContentLoaded : function(content) { assert(content == 1); this.content = 2; },
                    onContentBound : function(content) { assert(content == 2); this.content = 3; }
                });
                view = new view();
                assert(view.content == 1);
                view.attach(document.createElement('div'));
                assert(view.content == 3);
                done();
            });

            it('should execute onContentLoaded but not onContentBound when setContent() is called and container is not set', function(done) {
                let view = lite.extend({
                    content : 0,
                    onContentLoaded : function(content) { assert(content == 1); this.content = 2; },
                    onContentBound : function(content) { assert(content == 2); this.content = 3; }
                });
                view = new view();
                assert(view.content == 0);
                view.setContent(1);
                assert(view.content == 2);
                done();
            });

            it('should execute onContentLoaded and onContentBound when setContent() is called and contanier is set', function(done) {
                let view = lite.extend({
                    content : 0,
                    container : document.createElement('div'),
                    onContentLoaded : function(content) { assert(content == 1); this.content = 2; },
                    onContentBound : function(content) { assert(content == 2); this.content = 3; }
                });
                view = new view();
                assert(view.content == 0);
                view.setContent(1);
                assert(view.content == 3);
                done();
            });
        });

        describe('Content loading and binding', function() { 
            it('should load text content from external source if contentUrl is provided', function(done) {
                let view = lite.extend({
                    contentUrl : '../tests/lite-test/lite-test.html',
                    container : document.createElement('div'),
                    onContentLoaded : function(content) { 
                        assert(content.includes('test-span'));
                        done();
                    }
                });
                view = new view();
                view.attach();
            });
            it('should attach content to container element', function(done) {
                let view = lite.extend({
                    contentUrl : '../tests/lite-test/lite-test.html',
                    container : document.createElement('div'),
                    onContentBound : function(content) { 
                        assert(view.container.innerHTML.includes('test-span')); 
                        done();
                    }
                });
                view = new view();
                view.attach();
            });

            it('should getElementById if container is an id string', function(done) {
                let div = document.createElement('div');
                div.id = 'container-attach-test';
                div.style.display = 'none';
                document.body.appendChild(div);

                let view = lite.extend({
                    container: 'container-attach-test',
                    content : 'test',
                    onContentBound : function() { 
                        assert(document.getElementById('container-attach-test').innerHTML == 'test');
                        done();
                    }
                });
                new view().attach();
            });
        });

        describe('Data binding', function() { 
            // data binding: 
                // should match on data-field
                // should work recursively if dot-notation is used 
                // should match on id if data field is empty

            it('bind data value to element if data-field matches property name', function(done){
                let view = lite.extend({
                    content : '<span data-field="bindTest"></span>',
                    data : { bindTest : 'testing' },
                    onDataBound : function() { 
                        assert(this.container.firstChild.innerHTML == 'testing');
                        done();
                    }
                });
                new view().attach(document.createElement('div'));
            });

            it('should bind data value to element if data-field is empty and id matches property name', function(done) {
                let view = lite.extend({
                    content : '<span data-field id="bindTest"></span>',
                    data : { bindTest : 'testing' },
                    onDataBound : function() { 
                        assert(this.container.firstChild.innerHTML == 'testing');
                        done();
                    }
                });
                new view().attach(document.createElement('div'));
            });

            it('should find nested data if data-field uses dot-notation', function(done) { 
                let view = lite.extend({
                    content : '<span data-field="outer.inner"></span>',
                    data : { outer : { inner : 'testing' } },
                    onDataBound : function() { 
                        assert(this.container.firstChild.innerHTML == 'testing');
                        done();
                    }
                });
                new view().attach(document.createElement('div'));
            });

            it('should call .onDataBound() after .bindData()', function(done) {
                let view = lite.extend({
                    content : '<span></span>',
                    onContentBound : function() { this.bindData({ data : 1 }); },
                    onDataBound : function() { done(); }
                });
                new view().attach(document.createElement('div'));
            });

        });

        describe('Script and Stylesheet loading', function() {
            it('should load a css file if loadStyleSheet is called', function() { 
                let view = lite.extend({
                    content : 'a',
                    initialize : function() { 
                        this.loadStyleSheet('../tests/lite-test/lite-test.css');
                    }
                });
                new view().attach();
                let css = document.createElement('link');
                css.href = '../tests/lite-test/lite-test.css';
                
                let links = document.getElementsByTagName('link');
                let has = Array.from(links).some((link) => { 
                    return link.href == css.href;
                });
                assert(has);
            });
            it('should load a script file if loadScript is called', function() { 
                let view = lite.extend({
                    content : 'a',
                    initialize : function() { 
                        this.loadScript('../tests/lite-test/lite-test-script.js');
                    }
                });
                new view().attach();
                let script = document.createElement('script');
                script.src = '../tests/lite-test/lite-test-script.js';

                let scripts = Array.from(document.getElementsByTagName('script'));
                let hasScript = scripts.some(scr => {
                    return scr.src == script.src;
                });
                assert(hasScript);
            });
        });

        

    });
};

let RouterTests = function() {
    let assert = chai.assert;
    describe('Router Tests', function() { 

        describe('onHashChange tests', function() {
            it('should trigger custom onHashChange event when window hash changes', function(done) { 
                new Router({
                    onHashChange : function() { 
                        done(); 
                        window.onhashchange = null;
                    }
                });
                window.onhashchange();
            });

            it('should return path.value if a path.pattern matches location.hash', function(done) { 
                new Router({
                    onHashChange : function(path, value) {
                        value();
                    },
                    paths : [
                        { 
                            hash : 'test/path', 
                            value : function() { 
                                done();
                                window.onhashchange = null;
                                window.location.hash = '';
                            } 
                        }
                    ]
                });
                window.location.hash = 'test/path';
                window.onhashchange();
            });
        });
        

        describe('path.hash parsing / pattern matching tests', function() {
            it('should escape special characters', function() { 
                let router = new Router(); 
                window.onhashchange = null;
                let pattern = router.getHashRegex('testing()');
                assert(pattern.test('#testing()'));
            });
            
            it('should convert a path string to a regex when getHashRegex is called', function() {
                let router = new Router();
                window.onhashchange = null;
                let pattern = router.getHashRegex('test/path');
                assert(pattern.test('#test/path'));
            });

            it('should allow for path wildcards when {braces} are used in the path', function() {
                let router = new Router();
                window.onhashchange = null;
                let pattern = router.getHashRegex('test/path/{id}');
                assert(pattern.test('#test/path/wildcard'));
            });
        });

        describe('URLSearchParameter parsing tests', function() { 
            it('should parse url parameters into object when getSearchParams is called', function() { 
                let router = new Router();
                window.onhashchange = null;
                let parsed = router.getSearchParams("?key1=val1&key2=val2");
                assert(parsed.key1 == "val1");
            });
    
            it('should convert "amp;" to "&" when location.hash is used', function() { 
                let router = new Router();
                window.onhashchange = null;
                let parsed = router.getSearchParams("?key1=val1&amp;key2=val2");
                assert(parsed.key2 == 'val2');
            });
        });

    });
};

let XHRTests = function() {
    let assert = chai.assert;

    describe('XHR tests', function() { 
        describe('xhr.init() tests', function() { 
            it('should fetch text data from an external resource', function(done) { 
                let request = xhr.init('../tests/xhr-test/xhr-test.txt', {
                    load : function(r) {
                        assert(request.response == 'test');
                        done();
                    }
                });
                request.send();
            });

            it('should return an unsent XMLHttpRequest object', function(done) { 
                let request = xhr.init('../does/not/really/matter');
                assert(request instanceof XMLHttpRequest);
                setTimeout(()=>{
                    assert(request.readyState == 1);
                    done();
                }, 5);
            });

            it('should allow for setting of XMLHttpRequest events', function(done) {
                let request = xhr.init('../tests/xhr-test/xhr-test.txt', { 
                    load : function() { 
                        done();
                    }
                });
                request.send();
            });

            it('should return a "thennable" interface', function() { 
                let request = xhr.init('../xyz', { 
                    load : function() {},
                    error : function() {}
                });
                assert(typeof(request.then) == 'function');
                assert(typeof(request.catch) == 'function');
            });

            it('should send when .then() is called', function(done) {
                xhr.init('../tests/xhr-test/xhr-test.txt')
                    .then(r => { done(); });
            });

            it('should throw an error when .then() fails', function(done) {
                xhr.get('./fail.txt')
                    .then(r => { assert(false); })
                    .error(e => { done(); });
            });

        });
    });
};

export { LiteTests, RouterTests, XHRTests };
