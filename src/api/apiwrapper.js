/*
 * Copyright 2010-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import moment from 'moment'
import axios from 'axios'
import CryptoJS from 'crypto-js'

 var uritemplate = (function() {

 // Below are the functions we originally used from jQuery.
 // The implementations below are often more naive then what is inside jquery, but they suffice for our needs.

     function isFunction(fn) {
         return typeof fn == 'function';
     }

     function isEmptyObject (obj) {
         for(var name in obj){
             return false;
         }
         return true;
     }

     function extend(base, newprops) {
         for (var name in newprops) {
             base[name] = newprops[name];
         }
         return base;
     }

     /**
      * Create a runtime cache around retrieved values from the context.
      * This allows for dynamic (function) results to be kept the same for multiple
      * occuring expansions within one template.
      * Note: Uses key-value tupples to be able to cache null values as well.
      */
         //TODO move this into prep-processing
     function CachingContext(context) {
         this.raw = context;
         this.cache = {};
     }
     CachingContext.prototype.get = function(key) {
         var val = this.lookupRaw(key);
         var result = val;

         if (isFunction(val)) { // check function-result-cache
             var tupple = this.cache[key];
             if (tupple !== null && tupple !== undefined) {
                 result = tupple.val;
             } else {
                 result = val(this.raw);
                 this.cache[key] = {key: key, val: result};
                 // NOTE: by storing tupples we make sure a null return is validly consistent too in expansions
             }
         }
         return result;
     };

     CachingContext.prototype.lookupRaw = function(key) {
         return CachingContext.lookup(this, this.raw, key);
     };

     CachingContext.lookup = function(me, context, key) {
         var result = context[key];
         if (result !== undefined) {
             return result;
         } else {
             var keyparts = key.split('.');
             var i = 0, keysplits = keyparts.length - 1;
             for (i = 0; i<keysplits; i++) {
                 var leadKey = keyparts.slice(0, keysplits - i).join('.');
                 var trailKey = keyparts.slice(-i-1).join('.');
                 var leadContext = context[leadKey];
                 if (leadContext !== undefined) {
                     return CachingContext.lookup(me, leadContext, trailKey);
                 }
             }
             return undefined;
         }
     };


     function UriTemplate(set) {
         this.set = set;
     }

     UriTemplate.prototype.expand = function(context) {
         var cache = new CachingContext(context);
         var res = "";
         var i = 0, cnt = this.set.length;
         for (i = 0; i<cnt; i++ ) {
             res += this.set[i].expand(cache);
         }
         return res;
     };

 //TODO: change since draft-0.6 about characters in literals
     /* extract:
      The characters outside of expressions in a URI Template string are intended to be copied literally to the URI-reference if the character is allowed in a URI (reserved / unreserved / pct-encoded) or, if not allowed, copied to the URI-reference in its UTF-8 pct-encoded form.
      */
     function Literal(txt ) {
         this.txt = txt;
     }

     Literal.prototype.expand = function() {
         return this.txt;
     };



     var RESERVEDCHARS_RE = new RegExp("[:/?#\\[\\]@!$&()*+,;=']","g");
     function encodeNormal(val) {
         return encodeURIComponent(val).replace(RESERVEDCHARS_RE, function(s) {return escape(s);} );
     }

 //var SELECTEDCHARS_RE = new RegExp("[]","g");
     function encodeReserved(val) {
         //return encodeURI(val).replace(SELECTEDCHARS_RE, function(s) {return escape(s)} );
         return encodeURI(val); // no need for additional replace if selected-chars is empty
     }


     function addUnNamed(name, key, val) {
         return key + (key.length > 0 ? "=" : "") + val;
     }

     function addNamed(name, key, val, noName) {
         noName = noName || false;
         if (noName) { name = ""; }

         if (!key || key.length === 0)  {
             key = name;
         }
         return key + (key.length > 0 ? "=" : "") + val;
     }

     function addLabeled(name, key, val, noName) {
         noName = noName || false;
         if (noName) { name = ""; }

         if (!key || key.length === 0)  {
             key = name;
         }
         return key + (key.length > 0 && val ? "=" : "") + val;
     }


     var simpleConf = {
         prefix : "",     joiner : ",",     encode : encodeNormal,    builder : addUnNamed
     };
     var reservedConf = {
         prefix : "",     joiner : ",",     encode : encodeReserved,  builder : addUnNamed
     };
     var fragmentConf = {
         prefix : "#",    joiner : ",",     encode : encodeReserved,  builder : addUnNamed
     };
     var pathParamConf = {
         prefix : ";",    joiner : ";",     encode : encodeNormal,    builder : addLabeled
     };
     var formParamConf = {
         prefix : "?",    joiner : "&",     encode : encodeNormal,    builder : addNamed
     };
     var formContinueConf = {
         prefix : "&",    joiner : "&",     encode : encodeNormal,    builder : addNamed
     };
     var pathHierarchyConf = {
         prefix : "/",    joiner : "/",     encode : encodeNormal,    builder : addUnNamed
     };
     var labelConf = {
         prefix : ".",    joiner : ".",     encode : encodeNormal,    builder : addUnNamed
     };


     function Expression(conf, vars ) {
         extend(this, conf);
         this.vars = vars;
     }

     Expression.build = function(ops, vars) {
         var conf;
         switch(ops) {
             case ''  : conf = simpleConf; break;
             case '+' : conf = reservedConf; break;
             case '#' : conf = fragmentConf; break;
             case ';' : conf = pathParamConf; break;
             case '?' : conf = formParamConf; break;
             case '&' : conf = formContinueConf; break;
             case '/' : conf = pathHierarchyConf; break;
             case '.' : conf = labelConf; break;
             default  : throw "Unexpected operator: '"+ops+"'";
         }
         return new Expression(conf, vars);
     };

     Expression.prototype.expand = function(context) {
         var joiner = this.prefix;
         var nextjoiner = this.joiner;
         var buildSegment = this.builder;
         var res = "";
         var i = 0, cnt = this.vars.length;

         for (i = 0 ; i< cnt; i++) {
             var varspec = this.vars[i];
             varspec.addValues(context, this.encode, function(key, val, noName) {
                 var segm = buildSegment(varspec.name, key, val, noName);
                 if (segm !== null && segm !== undefined) {
                     res += joiner + segm;
                     joiner = nextjoiner;
                 }
             });
         }
         return res;
     };



     var UNBOUND = {};

     /**
      * Helper class to help grow a string of (possibly encoded) parts until limit is reached
      */
     function Buffer(limit) {
         this.str = "";
         if (limit === UNBOUND) {
             this.appender = Buffer.UnboundAppend;
         } else {
             this.len = 0;
             this.limit = limit;
             this.appender = Buffer.BoundAppend;
         }
     }

     Buffer.prototype.append = function(part, encoder) {
         return this.appender(this, part, encoder);
     };

     Buffer.UnboundAppend = function(me, part, encoder) {
         part = encoder ? encoder(part) : part;
         me.str += part;
         return me;
     };

     Buffer.BoundAppend = function(me, part, encoder) {
         part = part.substring(0, me.limit - me.len);
         me.len += part.length;

         part = encoder ? encoder(part) : part;
         me.str += part;
         return me;
     };


     function arrayToString(arr, encoder, maxLength) {
         var buffer = new Buffer(maxLength);
         var joiner = "";

         var i = 0, cnt = arr.length;
         for (i=0; i<cnt; i++) {
             if (arr[i] !== null && arr[i] !== undefined) {
                 buffer.append(joiner).append(arr[i], encoder);
                 joiner = ",";
             }
         }
         return buffer.str;
     }

     function objectToString(obj, encoder, maxLength) {
         var buffer = new Buffer(maxLength);
         var joiner = "";
         var k;

         for (k in obj) {
             if (obj.hasOwnProperty(k) ) {
                 if (obj[k] !== null && obj[k] !== undefined) {
                     buffer.append(joiner + k + ',').append(obj[k], encoder);
                     joiner = ",";
                 }
             }
         }
         return buffer.str;
     }


     function simpleValueHandler(me, val, valprops, encoder, adder) {
         var result;

         if (valprops.isArr) {
             result = arrayToString(val, encoder, me.maxLength);
         } else if (valprops.isObj) {
             result = objectToString(val, encoder, me.maxLength);
         } else {
             var buffer = new Buffer(me.maxLength);
             result = buffer.append(val, encoder).str;
         }

         adder("", result);
     }

     function explodeValueHandler(me, val, valprops, encoder, adder) {
         if (valprops.isArr) {
             var i = 0, cnt = val.length;
             for (i = 0; i<cnt; i++) {
                 adder("", encoder(val[i]) );
             }
         } else if (valprops.isObj) {
             var k;
             for (k in val) {
                 if (val.hasOwnProperty(k)) {
                     adder(k, encoder(val[k]) );
                 }
             }
         } else { // explode-requested, but single value
             adder("", encoder(val));
         }
     }

     function valueProperties(val) {
         var isArr = false;
         var isObj = false;
         var isUndef = true;  //note: "" is empty but not undef

         if (val !== null && val !== undefined) {
             isArr = (val.constructor === Array);
             isObj = (val.constructor === Object);
             isUndef = (isArr && val.length === 0) || (isObj && isEmptyObject(val));
         }

         return {isArr: isArr, isObj: isObj, isUndef: isUndef};
     }


     function VarSpec (name, vhfn, nums) {
         this.name = unescape(name);
         this.valueHandler = vhfn;
         this.maxLength = nums;
     }


     VarSpec.build = function(name, expl, part, nums) {
         var valueHandler, valueModifier;

         if (!!expl) { //interprete as boolean
             valueHandler = explodeValueHandler;
         } else {
             valueHandler = simpleValueHandler;
         }

         if (!part) {
             nums = UNBOUND;
         }

         return new VarSpec(name, valueHandler, nums);
     };


     VarSpec.prototype.addValues = function(context, encoder, adder) {
         var val = context.get(this.name);
         var valprops = valueProperties(val);
         if (valprops.isUndef) { return; } // ignore empty values
         this.valueHandler(this, val, valprops, encoder, adder);
     };



 //----------------------------------------------parsing logic
 // How each varspec should look like
     var VARSPEC_RE=/([^*:]*)((\*)|(:)([0-9]+))?/;

     var match2varspec = function(m) {
         var name = m[1];
         var expl = m[3];
         var part = m[4];
         var nums = parseInt(m[5], 10);

         return VarSpec.build(name, expl, part, nums);
     };


 // Splitting varspecs in list with:
     var LISTSEP=",";

 // How each template should look like
     var TEMPL_RE=/(\{([+#.;?&\/])?(([^.*:,{}|@!=$()][^*:,{}$()]*)(\*|:([0-9]+))?(,([^.*:,{}][^*:,{}]*)(\*|:([0-9]+))?)*)\})/g;
 // Note: reserved operators: |!@ are left out of the regexp in order to make those templates degrade into literals
 // (as expected by the spec - see tests.html "reserved operators")


     var match2expression = function(m) {
         var expr = m[0];
         var ops = m[2] || '';
         var vars = m[3].split(LISTSEP);
         var i = 0, len = vars.length;
         for (i = 0; i<len; i++) {
             var match;
             if ( (match = vars[i].match(VARSPEC_RE)) === null) {
                 throw "unexpected parse error in varspec: " + vars[i];
             }
             vars[i] = match2varspec(match);
         }

         return Expression.build(ops, vars);
     };


     var pushLiteralSubstr = function(set, src, from, to) {
         if (from < to) {
             var literal = src.substr(from, to - from);
             set.push(new Literal(literal));
         }
     };

     var parse = function(str) {
         var lastpos = 0;
         var comp = [];

         var match;
         var pattern = TEMPL_RE;
         pattern.lastIndex = 0; // just to be sure
         while ((match = pattern.exec(str)) !== null) {
             var newpos = match.index;
             pushLiteralSubstr(comp, str, lastpos, newpos);

             comp.push(match2expression(match));
             lastpos = pattern.lastIndex;
         }
         pushLiteralSubstr(comp, str, lastpos, str.length);

         return new UriTemplate(comp);
     };


 //-------------------------------------------comments and ideas

 //TODO: consider building cache of previously parsed uris or even parsed expressions?

     return parse;

 }());

 var apiGateway = apiGateway || {};
 apiGateway.core = apiGateway.core || {};

 apiGateway.core.sigV4ClientFactory = {};
 apiGateway.core.sigV4ClientFactory.newClient = function (config) {
     var AWS_SHA_256 = 'AWS4-HMAC-SHA256';
     var AWS4_REQUEST = 'aws4_request';
     var AWS4 = 'AWS4';
     var DATE_FORMAT = 'YYYYMMDD';
     var TIME_FORMAT = 'HHmmss';
     var X_AMZ_DATE = 'x-amz-date';
     var X_AMZ_SECURITY_TOKEN = 'x-amz-security-token';
     var HOST = 'host';
     var AUTHORIZATION = 'Authorization';

     function hash(value) {
         return CryptoJS.SHA256(value);
     }

     function hexEncode(value) {
         return value.toString(CryptoJS.enc.Hex);
     }

     function hmac(secret, value) {
         return CryptoJS.HmacSHA256(value, secret, {asBytes: true});
     }

     function buildCanonicalRequest(method, path, queryParams, headers, payload) {
         return method + '\n' +
             buildCanonicalUri(path) + '\n' +
             buildCanonicalQueryString(queryParams) + '\n' +
             buildCanonicalHeaders(headers) + '\n' +
             buildCanonicalSignedHeaders(headers) + '\n' +
             hexEncode(hash(payload));
     }

     function hashCanonicalRequest(request) {
         return hexEncode(hash(request));
     }

     function buildCanonicalUri(uri) {
         return encodeURI(uri);
     }

     function buildCanonicalQueryString(queryParams) {
         if (Object.keys(queryParams).length < 1) {
             return '';
         }

         var sortedQueryParams = [];
         for (var property in queryParams) {
             if (queryParams.hasOwnProperty(property)) {
                 sortedQueryParams.push(property);
             }
         }
         sortedQueryParams.sort();

         var canonicalQueryString = '';
         for (var i = 0; i < sortedQueryParams.length; i++) {
             canonicalQueryString += sortedQueryParams[i] + '=' + encodeURIComponent(queryParams[sortedQueryParams[i]]) + '&';
         }
         return canonicalQueryString.substr(0, canonicalQueryString.length - 1);
     }

     function buildCanonicalHeaders(headers) {
         var canonicalHeaders = '';
         var sortedKeys = [];
         for (var property in headers) {
             if (headers.hasOwnProperty(property)) {
                 sortedKeys.push(property);
             }
         }
         sortedKeys.sort();

         for (var i = 0; i < sortedKeys.length; i++) {
             canonicalHeaders += sortedKeys[i].toLowerCase() + ':' + headers[sortedKeys[i]] + '\n';
         }
         return canonicalHeaders;
     }

     function buildCanonicalSignedHeaders(headers) {
         var sortedKeys = [];
         for (var property in headers) {
             if (headers.hasOwnProperty(property)) {
                 sortedKeys.push(property.toLowerCase());
             }
         }
         sortedKeys.sort();

         return sortedKeys.join(';');
     }

     function buildStringToSign(date, credentialScope, hashedCanonicalRequest) {
         return AWS_SHA_256 + '\n' +
             buildXAmzDate(date) + '\n' +
             credentialScope + '\n' +
             hashedCanonicalRequest;
     }

     function buildCredentialScope(date, region, service) {
         return date.format(DATE_FORMAT) + '/' + region + '/' + service + '/' + AWS4_REQUEST
     }

     function calculateSigningKey(secretKey, date, region, service) {
         return hmac(hmac(hmac(hmac(AWS4 + secretKey, date.format(DATE_FORMAT)), region), service), AWS4_REQUEST);
     }

     function calculateSignature(key, stringToSign) {
         return hexEncode(hmac(key, stringToSign));
     }

     function buildXAmzDate(date) {
         return date.format(DATE_FORMAT) + 'T' + date.format(TIME_FORMAT) + 'Z';
     }

     function buildAuthorizationHeader(accessKey, credentialScope, headers, signature) {
         return AWS_SHA_256 + ' Credential=' + accessKey + '/' + credentialScope + ', SignedHeaders=' + buildCanonicalSignedHeaders(headers) + ', Signature=' + signature;
     }

     var awsSigV4Client = { };
     if(config.accessKey === undefined || config.secretKey === undefined) {
         return awsSigV4Client;
     }
     awsSigV4Client.accessKey = apiGateway.core.utils.assertDefined(config.accessKey, 'accessKey');
     awsSigV4Client.secretKey = apiGateway.core.utils.assertDefined(config.secretKey, 'secretKey');
     awsSigV4Client.sessionToken = config.sessionToken;
     awsSigV4Client.serviceName = apiGateway.core.utils.assertDefined(config.serviceName, 'serviceName');
     awsSigV4Client.region = apiGateway.core.utils.assertDefined(config.region, 'region');
     awsSigV4Client.endpoint = apiGateway.core.utils.assertDefined(config.endpoint, 'endpoint');

     awsSigV4Client.makeRequest = function (request) {
         var verb = apiGateway.core.utils.assertDefined(request.verb, 'verb');
         var path = apiGateway.core.utils.assertDefined(request.path, 'path');
         var queryParams = apiGateway.core.utils.copy(request.queryParams);
         if (queryParams === undefined) {
             queryParams = {};
         }
         var headers = apiGateway.core.utils.copy(request.headers);
         if (headers === undefined) {
             headers = {};
         }

         //If the user has not specified an override for Content type the use default
         if(headers['Content-Type'] === undefined) {
             headers['Content-Type'] = config.defaultContentType;
         }

         //If the user has not specified an override for Accept type the use default
         if(headers['Accept'] === undefined) {
             headers['Accept'] = config.defaultAcceptType;
         }

         var body = apiGateway.core.utils.copy(request.body);
         if (body === undefined || verb === 'GET') { // override request body and set to empty when signing GET requests
             body = '';
         }  else {
             body = JSON.stringify(body);
         }

         //If there is no body remove the content-type header so it is not included in SigV4 calculation
         if(body === '' || body === undefined || body === null) {
             delete headers['Content-Type'];
         }

         var date = moment.utc();
         headers[X_AMZ_DATE] = buildXAmzDate(date);
         var parser = document.createElement('a');
         parser.href = awsSigV4Client.endpoint;
         headers[HOST] = parser.hostname;

         var canonicalRequest = buildCanonicalRequest(verb, path, queryParams, headers, body);
         var hashedCanonicalRequest = hashCanonicalRequest(canonicalRequest);
         var credentialScope = buildCredentialScope(date, awsSigV4Client.region, awsSigV4Client.serviceName);
         var stringToSign = buildStringToSign(date, credentialScope, hashedCanonicalRequest);
         var signingKey = calculateSigningKey(awsSigV4Client.secretKey, date, awsSigV4Client.region, awsSigV4Client.serviceName);
         var signature = calculateSignature(signingKey, stringToSign);
         headers[AUTHORIZATION] = buildAuthorizationHeader(awsSigV4Client.accessKey, credentialScope, headers, signature);
         if(awsSigV4Client.sessionToken !== undefined && awsSigV4Client.sessionToken !== '') {
             headers[X_AMZ_SECURITY_TOKEN] = awsSigV4Client.sessionToken;
         }
         delete headers[HOST];

         var url = config.endpoint + path;
         var queryString = buildCanonicalQueryString(queryParams);
         if (queryString != '') {
             url += '?' + queryString;
         }

         //Need to re-attach Content-Type if it is not specified at this point
         if(headers['Content-Type'] === undefined) {
             headers['Content-Type'] = config.defaultContentType;
         }

         var signedRequest = {
             method: verb,
             url: url,
             headers: headers,
             data: body
         };
         return axios(signedRequest);
     };

     return awsSigV4Client;
 };

 apiGateway.core.simpleHttpClientFactory = {};
 apiGateway.core.simpleHttpClientFactory.newClient = function (config) {
     function buildCanonicalQueryString(queryParams) {
         //Build a properly encoded query string from a QueryParam object
         if (Object.keys(queryParams).length < 1) {
             return '';
         }

         var canonicalQueryString = '';
         for (var property in queryParams) {
             if (queryParams.hasOwnProperty(property)) {
                 canonicalQueryString += encodeURIComponent(property) + '=' + encodeURIComponent(queryParams[property]) + '&';
             }
         }

         return canonicalQueryString.substr(0, canonicalQueryString.length - 1);
     }

     var simpleHttpClient = { };
     simpleHttpClient.endpoint = apiGateway.core.utils.assertDefined(config.endpoint, 'endpoint');

     simpleHttpClient.makeRequest = function (request) {
         var verb = apiGateway.core.utils.assertDefined(request.verb, 'verb');
         var path = apiGateway.core.utils.assertDefined(request.path, 'path');
         var queryParams = apiGateway.core.utils.copy(request.queryParams);
         if (queryParams === undefined) {
             queryParams = {};
         }
         var headers = apiGateway.core.utils.copy(request.headers);
         if (headers === undefined) {
             headers = {};
         }

         //If the user has not specified an override for Content type the use default
         if(headers['Content-Type'] === undefined) {
             headers['Content-Type'] = config.defaultContentType;
         }

         //If the user has not specified an override for Accept type the use default
         if(headers['Accept'] === undefined) {
             headers['Accept'] = config.defaultAcceptType;
         }

         var body = apiGateway.core.utils.copy(request.body);
         if (body === undefined) {
             body = '';
         }

         var url = config.endpoint + path;
         var queryString = buildCanonicalQueryString(queryParams);
         if (queryString != '') {
             url += '?' + queryString;
         }
         var simpleHttpRequest = {
             method: verb,
             url: url,
             headers: headers,
             data: body
         };
         return axios(simpleHttpRequest);
     };
     return simpleHttpClient;
 };

 apiGateway.core.utils = {
     assertDefined: function (object, name) {
         if (object === undefined) {
             throw name + ' must be defined';
         } else {
             return object;
         }
     },
     assertParametersDefined: function (params, keys, ignore) {
         if (keys === undefined) {
             return;
         }
         if (keys.length > 0 && params === undefined) {
             params = {};
         }
         for (var i = 0; i < keys.length; i++) {
             if(!apiGateway.core.utils.contains(ignore, keys[i])) {
                 apiGateway.core.utils.assertDefined(params[keys[i]], keys[i]);
             }
         }
     },
     parseParametersToObject: function (params, keys) {
         if (params === undefined) {
             return {};
         }
         var object = { };
         for (var i = 0; i < keys.length; i++) {
             object[keys[i]] = params[keys[i]];
         }
         return object;
     },
     contains: function(a, obj) {
         if(a === undefined) { return false;}
         var i = a.length;
         while (i--) {
             if (a[i] === obj) {
                 return true;
             }
         }
         return false;
     },
     copy: function (obj) {
         if (null == obj || "object" != typeof obj) return obj;
         var copy = obj.constructor();
         for (var attr in obj) {
             if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
         }
         return copy;
     },
     mergeInto: function (baseObj, additionalProps) {
         if (null == baseObj || "object" != typeof baseObj) return baseObj;
         var merged = baseObj.constructor();
         for (var attr in baseObj) {
             if (baseObj.hasOwnProperty(attr)) merged[attr] = baseObj[attr];
         }
         if (null == additionalProps || "object" != typeof additionalProps) return baseObj;
         for (attr in additionalProps) {
             if (additionalProps.hasOwnProperty(attr)) merged[attr] = additionalProps[attr];
         }
         return merged;
     }
 };

 apiGateway.core.apiGatewayClientFactory = {};
 apiGateway.core.apiGatewayClientFactory.newClient = function (simpleHttpClientConfig, sigV4ClientConfig) {
     var apiGatewayClient = { };
     //Spin up 2 httpClients, one for simple requests, one for SigV4
     var sigV4Client = apiGateway.core.sigV4ClientFactory.newClient(sigV4ClientConfig);
     var simpleHttpClient = apiGateway.core.simpleHttpClientFactory.newClient(simpleHttpClientConfig);

     apiGatewayClient.makeRequest = function (request, authType, additionalParams, apiKey) {
         //Default the request to use the simple http client
         var clientToUse = simpleHttpClient;

         //Attach the apiKey to the headers request if one was provided
         if (apiKey !== undefined && apiKey !== '' && apiKey !== null) {
             request.headers['x-api-key'] = apiKey;
         }

         if (request.body === undefined || request.body === '' || request.body === null || Object.keys(request.body).length === 0) {
             request.body = undefined;
         }

         // If the user specified any additional headers or query params that may not have been modeled
         // merge them into the appropriate request properties
         request.headers = apiGateway.core.utils.mergeInto(request.headers, additionalParams.headers);
         request.queryParams = apiGateway.core.utils.mergeInto(request.queryParams, additionalParams.queryParams);

         //If an auth type was specified inject the appropriate auth client
         if (authType === 'AWS_IAM') {
             clientToUse = sigV4Client;
         }

         //Call the selected http client to make the request, returning a promise once the request is sent
         return clientToUse.makeRequest(request);
     };
     return apiGatewayClient;
 };

var apigClientFactory = {};
apigClientFactory.newClient = function (config) {
    var apigClient = { };
    if(config === undefined) {
        config = {
            accessKey: '',
            secretKey: '',
            sessionToken: '',
            region: '',
            apiKey: undefined,
            defaultContentType: 'application/json',
            defaultAcceptType: 'application/json'
        };
    }
    if(config.accessKey === undefined) {
        config.accessKey = '';
    }
    if(config.secretKey === undefined) {
        config.secretKey = '';
    }
    if(config.apiKey === undefined) {
        config.apiKey = '';
    }
    if(config.sessionToken === undefined) {
        config.sessionToken = '';
    }
    if(config.region === undefined) {
        config.region = 'us-east-1';
    }
    //If defaultContentType is not defined then default to application/json
    if(config.defaultContentType === undefined) {
        config.defaultContentType = 'application/json';
    }
    //If defaultAcceptType is not defined then default to application/json
    if(config.defaultAcceptType === undefined) {
        config.defaultAcceptType = 'application/json';
    }


    var endpoint = 'https://sfoehx6z94.execute-api.us-east-1.amazonaws.com/PetStoreProd';
    var parser = document.createElement('a');
    parser.href = endpoint;

    //Use the protocol and host components to build the canonical endpoint
    endpoint = parser.protocol + '//' + parser.host;

    //Store any path components that were present in the endpoint to append to API calls
    var pathComponent = parser.pathname;
    if (pathComponent.charAt(0) !== '/') { // IE 9
        pathComponent = '/' + pathComponent;
    }

    var sigV4ClientConfig = {
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        sessionToken: config.sessionToken,
        serviceName: 'execute-api',
        region: config.region,
        endpoint: endpoint,
        defaultContentType: config.defaultContentType,
        defaultAcceptType: config.defaultAcceptType
    };

    var authType = 'NONE';
    if (sigV4ClientConfig.accessKey !== undefined && sigV4ClientConfig.accessKey !== '' && sigV4ClientConfig.secretKey !== undefined && sigV4ClientConfig.secretKey !== '') {
        authType = 'AWS_IAM';
    }

    var simpleHttpClientConfig = {
        endpoint: endpoint,
        defaultContentType: config.defaultContentType,
        defaultAcceptType: config.defaultAcceptType
    };

    var apiGatewayClient = apiGateway.core.apiGatewayClientFactory.newClient(simpleHttpClientConfig, sigV4ClientConfig);



    apigClient.loginPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, ['body'], ['body']);

        var loginPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/login').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(loginPostRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.loginOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);

        var loginOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/login').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(loginOptionsRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.petsGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);

        var petsGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/pets').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(petsGetRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.petsPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, ['body'], ['body']);

        var petsPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/pets').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(petsPostRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.petsOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);

        var petsOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/pets').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(petsOptionsRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.petsPetIdGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, ['petId'], ['body']);

        var petsPetIdGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/pets/{petId}').expand(apiGateway.core.utils.parseParametersToObject(params, ['petId'])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(petsPetIdGetRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.petsPetIdOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);

        var petsPetIdOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/pets/{petId}').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(petsPetIdOptionsRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.usersPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, ['body'], ['body']);

        var usersPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/users').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(usersPostRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.usersOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }

        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);

        var usersOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/users').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };


        return apiGatewayClient.makeRequest(usersOptionsRequest, authType, additionalParams, config.apiKey);
    };


    return apigClient;
};

export { apigClientFactory }
