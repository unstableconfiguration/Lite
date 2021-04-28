# lite  

## basic usage
At its most basic, lite is about attaching text or html content to a container HTMLElement in a predictable and customizable way. 

```javascript 
let view = lite.extend({
    container : 'base-demo',
    content : '<span>Basic usage test.</span>'
});

new view().attach();
```
<div id='base-demo'></div>

## .extend(options = {})
.extend creates a clone of the base lite object with all its defaults. It accepts an object as a parameter. The clone will contain all of the property:value pairings of the parameter object, which is used to overwrite default values or to add custom functionality to the view.

```javascript 
let view = lite.extend({
    container : 'extend-demo',
    content : '<b>Default Content :</b> ',
    customProperty : 'custom text',
    onContentLoaded : function() { 
        this.content = this.content + this.customProperty;
    }
});

new view().attach();
```
<div id='extend-demo'></div>

## .container 
Each lite view needs a container element to attach to. The container can be defined either as part of the .extend({}) parameter object, or as a parameter to the .attach() function. In either case, the container can be a reference to an HTMLElement, or it can be an id to look up the element with. 

```javascript
let view = lite.extend({
    // Container can be set in the .extend object. It can be an ID or an HTMLElement
    container : document.getElementById('container-demo') || 'container-demo',
    content : '<b>Container demo</b>'
});

new view().attach();
```
<div id='container-demo'></div>

## .attach();
.attach() begins the view lifecycle, resulting in the content being bound to the container. The .container can be passed to .attach() as an optional parameter. 

```javascript
let view = lite.extend({ content : '<span style="background:#966; color:white; font-weight:bold;; padding:0 .2em;">Attach Test</span>' });

// Just as with setting .container in the object, the parameter can be a HTMLElement or a id string.
new view().attach('attach-demo');
```
<div id='attach-demo'></div>

## .content 
.content represents what will become the .innerHTML value of the .container. Typically it will be some form of stringified HTML, but there are no limitations on it.

```javascript
let view = lite.extend({
    container : 'content-demo',
    content : '<div><span style="background:#555; color:#fff;">HTML content: </span><span style="border:solid thin #555; padding:0em .2em;">Typical content will be a HTML string</span></div>'
});

new view().attach();
```
<div id='content-demo'></div>

## .contentUrl
An alternative to setting content is setting a .contentUrl. In this case, the text of the specified file will be loaded via XMLHttpRequest.

```javascript
let view = lite.extend({
    container : 'contentUrl-demo',
    // We can load the markdown source for this page.
    contentUrl : './documentation/contentUrl-demo.md'
});

new view().attach();
```
<div id='contentUrl-demo' style='max-height:100px; overflow:scroll;'></div>

## .setContent(content = '');
Content can be explicitly set via the .setContent() function. Doing so will trigger the normal view lifecycle.


```javascript
let view = lite.extend({
    onContentLoaded : function(content) { this.content = marked(content); },
});
view = new view();
view.attach('setContent-demo')

view.setContent('**Setting via .setContent**: Content is set and view lifecycle is triggered');
```
<div id='setContent-demo'></div>

## view lifecycle
There are several events in the view lifecycle that execute in order and can allow for customization of the view as it is being built up.

#### initialize(): 
* executes immediately after .attach() is called  
* can be used to kick off asynchronous events or define constants

#### onContentLoaded(content)
* executes immediately if .content is defined  
* executes after content is loaded if .contentUrl is defined  
* executes immediately after .bindContent is called  
* can be used to manipulate content before it has been bound 

#### onContentBound(content)
* executes after .container.innerHTML has been populated with .content
* executes after onContentLoaded  
* can be used to modify the container after content has been bound or to perform cleanup

#### onDataBound(data)
* executes automatically after onContentBound if .data is defined  
* executes after .bindData is called
* can be used to modify the container after data has been bound

```javascript
let view = lite.extend({
    container : 'lifecycle-demo',
    content : '',
    data : {},
    initialize : function() { 
        this.content += '<span style="color:white; background:#555; padding:.2em;">1.</span>' 
    },
    onContentLoaded : function(content) {
        this.content += '<span style="color:white; background:#666; padding:.2em;">2.</span>';
    },
    onContentBound : function(content) { 
        this.content = content + '<span style="color:white; background:#777; padding:.2em;">3.</span>';
        this.container.innerHTML = this.content;
    },
    onDataBound : function(data) {
        this.content = this.content + '<span style="color:white; background:#888; padding:.2em;">4.</span>';
        this.container.innerHTML = this.content
    }

});

new view().attach();
```
<div id='lifecycle-demo'></div>

## .bindData()
.bindData(data) is a data binding utility that uses a 'data-field' custom attribute to populate HTML elements with data. It will be called automatically if .data is defined, but can be called explicitly otherwise. 
If the data-field is set to a data property name, bindData will populate the element with that property value. If data field is left empty, bindData will use the element's id. If the data property is nested, dot.notation can be used to recursively load the property.

```javascript
let view = lite.extend({
    container : 'bindData-demo',
    content : '' +
        '<div data-field="fieldA"></div>' +
        '<input type="text" id="fieldB" data-field style="width:200px"></input>' +
        '<div data-field="nested.field"></div>',
    data : {
        fieldA : 'data-field = property',
        fieldB : 'data-field and id = property',
        nested : { field : 'dot.notation for nested values' }
    }

});

new view().attach();
```
<div id='bindData-demo'></div>

## .loadStyleSheet(path)
loadStyleSheet is a utility that can be used to add a .css link to the header. It accepts a string parameter that will become the 'href' value of the link. It won't do anything if a link already exists with that href. 

```javascript
let view = lite.extend({
    initialize : function() { 
        this.loadStyleSheet('../css/vendor/prism.css');
    }
});
```
Will add a link like this to the header: 
```html
<link rel="stylesheet" type="text/css" href="../css/vendor/prism.css">
```

## .loadScript(path)
loadScript is a utility that can be used to add a script tag to the header. It accepts a string parameter that will become the 'src' value of the tag. It won't do anything if a script already exists with that src.
```javascript
let view = lite.extend({
    initialize : function() { 
        this.loadScript('../scripts/vendor/prism.js');
    }
});
```
Will add a script link like this to the header:
```html
<script src="../scripts/vendor/prism.js"></script>
```

# Router
lite.Router is a utility to handle changes to the url hash. It is initialized once per page and has two major components: a paths array and an onHashChange event handler. Once initialized, it will attach the onHashChange handler to the window.onhashchange event.  
When the window.location.hash changes, the router will call the onHashChange event handler, passing up to three parameters:  
* hash: This will be the same value as window.location.hash
* value: The router will attempt to match the hash to one of the paths' hash value. If it does, it will pass the 'value' of that path. 
* args: If there are URL search parameters (?param1=x&param2=y), they will be parsed into an object and passed as this third parameter.

## Basic Usage
The router is initialized with a paths array and an onHashChange event handler. New paths can be added after initialization. Because the router attaches an event to the window.onhashchange event, only one router should be initialied in an application.

```javascript
let router = new lite.Router({
    paths : [
        { hash : 'routerTest', value : 'Testing basic hash:value pairing' },
        { hash : 'wildCardTest/{any}', value : 'Testing hash wildcards' },
        { hash : 'paramsTest', value : 'Testing parameter parsing' },
        { hash : /^#patternTest$/, value : 'Testing regex pattern' }
    ],
    onHashChange : function(hash, value, args) {
        document.getElementById('router-demo-hash').innerText = hash;
        document.getElementById('router-demo-value').innerText = value;
        document.getElementById('router-demo-args').innerText = JSON.stringify(args);
    }
});
window.router = router;
```
<div id='router-demo'>
    <div><span><b>Hash: </b></span><span id='router-demo-hash'></span></div>
    <div><span><b>Value: </b></span><span id='router-demo-value'></span></div>
    <div><span><b>Args: </b></span><span id='router-demo-args'></span></div>
</div>
<div><a href="#routerTest">Matching url hash to value</a></div>
<div><a href="#wildCardTest/1">Matching url hash with wildcard</a></div>
<div><a href="#paramsTest?param1=1&param2=b">URL search params parsing</a></div>
<div><a href="#patternTest">Regex pattern matching</a></div>

## .paths[path]
A path is an object for defining a relationship between a location.hash and a value. When the window.onhashchange event is triggered, the router will check the .paths array for a path that matches the location.hash.  

```javascript
let paths = [
    // Literal hash: Match the location.hash exactly with optional URLSearchParams
    { hash : 'page', value : 'Matches: #page' },
    { hash : 'file/path', value : 'Matches: #file/path' },

    // Wildcards: Match location.hash exactly except where {braces} are used
    { hash : 'page/{id}', value : 'Matches: #page/1 or #page/notes' },
    { hash : '{page}/test', value : 'Matches: docs/test or api/test' },

    // Regular Expression: Match where pattern.test(location.hash) is true.
    // Note: will not match URLSearchParams unless they are accounted for in the custom pattern
    { hash : /^#page$/, value : 'Matches: #page' },
    { hash : /^#file\/path\/.+(\?.*)?$/, value : 'Matches: #file/path/id?param1=1' }
]
```

## router.onHashChange();
onHashChange will be called any time the window.location.hash is modified. Up to three parameters will be passed to it. 

**hash:** The first parameter will be the location.hash value
**value:** The second parameter will match the .value of a matched path. If no path matches the location.hash, value will be null. 
**args:** The third parameter will be an object representing URLSearchParams (?arg1=1&arg2=2) contained in the hash. If there are no search parameters, args will be null.

```javascript
let routerInit = {
    paths : [/*...*/],
    onHashChange : function(hash, value, args) { 
        // Since value can be any type, there are unlimited strategies for handling it. 
        if(!value) { notFoundRedirect(); }
        if(typeof(value) === 'string') { import(value).then(r => {/*...*/}); }
        if(typeof(value) === 'function') { value(args); }
        if(value instanceof Promise) { value.then(response => { /*...*/ }); }
    }
}
```

## .addPath() / .addPaths()
router.addPath(path) and router.addPaths([paths]) can be used to add paths to the router after initialization. 

```javascript
// Router was set as a window/global variable in the basic-usage example
window.router.addPath({ hash : 'addPath/test', value : 'Testing .addPath' });
```

# xhr
lite.xhr is XMLHttpRequest wrapper utility that extends the syntax of default XMLHttpRequest objects. Its main functions are to allow XHR requests to be built and executed in one line of code.  

## .init 
.init initializes, opens, and returns a XMLHttpRequest object. It requires a url parameter, which will be used to call .open(url, 'GET', true) before returning the request. It has an optional second parameter, which is an object that can be used to set any XMLHttpRequest setting.  

```javascript
window.xhr = lite.xhr;

let request = xhr.init('./documentation/xhr-init-demo.md');
request.addEventListener('load', function() { 
    document.getElementById('xhr-init-demo').innerText = '1. ' + request.response; 
});
request.send();
```
<div id='xhr-init-demo'></div>

## args
An args object is the second parameter of .init, and is a parameter of any xhr function. Any property it contains will be set on the underlying XMLHttpRequest object, allowing for any setting to be defined. 

```javascript
xhr.init('./documentation/xhr-init-demo.md', {
    method : 'GET', // default: "GET"
    async : true, // default: true
    responseType : 'text', // default: "text"
    // Events: loadstart, load, loadend, error, progreess, timeout, abort
    load : function(ev) {
        document.getElementById('xhr-init-demo-b').innerText = '2. ' + ev.target.response;
    }
}).send();
```
<div id='xhr-init-demo-b'></div>

## .get()
Because 'GET' is the default verb, xhr.get is functionally identical to xhr.init. Future development will likely include additional functions for different HTTP verbs. 

```javascript
xhr.get('./documentation/xhr-get-demo.md', {
    load : function(ev) {
        document.getElementById('xhr-get-demo')
            .innerText = ev.target.response;
    }
}).send()
```
<div id='xhr-get-demo'></div>

## .then() / .load()
.then(response) and .load(response) are aliases for the same extension function that resolve the request by calling .send() and returning the .response value. 

```javascript
xhr.get('./documentation/xhr-get-demo.md')
    .then(response => document.getElementById('xhr-then-demo').innerText = response);
    //.load(response => ...)
```
<div id='xhr-then-demo'></div>

## .error()
.error(ex) is an extension function that can be chained on to .then/.load to allow for error handling.

```javascript
xhr.get('./documentation/fail.md')
    .then(response => { /*...*/ })
    .error(ex => { 
        document.getElementById('xhr-error-demo').innerText = 'Exception caught'
    });
```
<div id='xhr-error-demo'></div>