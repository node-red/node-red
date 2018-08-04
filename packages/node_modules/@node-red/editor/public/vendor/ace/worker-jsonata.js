!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).jsonata=e()}}(function(){return function(){return function e(t,r,n){function o(i,s){if(!r[i]){if(!t[i]){var u="function"==typeof require&&require;if(!s&&u)return u(i,!0);if(a)return a(i,!0);var c=new Error("Cannot find module '"+i+"'");throw c.code="MODULE_NOT_FOUND",c}var f=r[i]={exports:{}};t[i][0].call(f.exports,function(e){return o(t[i][1][e]||e)},f,f.exports,e,t,r,n)}return r[i].exports}for(var a="function"==typeof require&&require,i=0;i<n.length;i++)o(n[i]);return o}}()({1:[function(e,t,r){(function(r){"use strict";var n=b(e("babel-runtime/core-js/symbol")),o=b(e("babel-runtime/core-js/object/is")),a=b(e("babel-runtime/core-js/array/from")),i=b(e("babel-runtime/core-js/json/stringify")),s=b(e("babel-runtime/core-js/symbol/iterator")),u=b(e("babel-runtime/core-js/is-iterable")),c=b(e("babel-runtime/core-js/object/keys")),f=b(e("babel-runtime/regenerator")),l=b(e("babel-runtime/core-js/promise")),p=b(e("babel-runtime/core-js/number/is-integer")),d=b(e("babel-runtime/core-js/object/create")),h="function"==typeof n.default&&"symbol"==typeof s.default?function(e){return typeof e}:function(e){return e&&"function"==typeof n.default&&e.constructor===n.default&&e!==n.default.prototype?"symbol":typeof e};function b(e){return e&&e.__esModule?e:{default:e}}var v=function(){var e=f.default.mark(Q),t=f.default.mark(ee),n=f.default.mark(te),b=f.default.mark(re),v=f.default.mark(ne),g=f.default.mark(oe),m=f.default.mark(ae),y=f.default.mark(be),_=f.default.mark(ge),x=f.default.mark(me),k=f.default.mark(ye),w=f.default.mark(xe),j=f.default.mark(we),S=f.default.mark(Oe),O=f.default.mark(Pe),E=f.default.mark(Ye),A=f.default.mark(De),T=f.default.mark(Le),P=f.default.mark(Fe),Y=f.default.mark(Ce),D=f.default.mark(Je),M=f.default.mark(Be),L=f.default.mark(We),N=f.default.mark(Ve),F=f.default.mark(Qe),I=f.default.mark(Ze),R=f.default.mark(Xe),C=f.default.mark(tt),G=f.default.mark(rt),$=f.default.mark(nt),z={".":75,"[":80,"]":0,"{":70,"}":0,"(":80,")":0,",":0,"@":75,"#":70,";":80,":":80,"?":20,"+":50,"-":50,"*":60,"/":60,"%":60,"|":20,"=":40,"<":40,">":40,"^":40,"**":60,"..":20,":=":10,"!=":40,"<=":40,">=":40,"~>":40,and:30,or:25,in:40,"&":50,"!":0,"~":0},q={'"':'"',"\\":"\\","/":"/",b:"\b",f:"\f",n:"\n",r:"\r",t:"\t"},U=function(e){var t=0,r=e.length,n=function(e,r){return{type:e,value:r,position:t}};return function(o){if(t>=r)return null;for(var a=e.charAt(t);t<r&&" \t\n\r\v".indexOf(a)>-1;)t++,a=e.charAt(t);if(!0!==o&&"/"===a)return t++,n("regex",function(){for(var n,o,a=t,i=0;t<r;){var s=e.charAt(t);if("/"===s&&"\\"!==e.charAt(t-1)&&0===i){if(""===(n=e.substring(a,t)))throw{code:"S0301",stack:(new Error).stack,position:t};for(t++,s=e.charAt(t),a=t;"i"===s||"m"===s;)t++,s=e.charAt(t);return o=e.substring(a,t)+"g",new RegExp(n,o)}"("!==s&&"["!==s&&"{"!==s||"\\"===e.charAt(t-1)||i++,")"!==s&&"]"!==s&&"}"!==s||"\\"===e.charAt(t-1)||i--,t++}throw{code:"S0302",stack:(new Error).stack,position:t}}());if("."===a&&"."===e.charAt(t+1))return t+=2,n("operator","..");if(":"===a&&"="===e.charAt(t+1))return t+=2,n("operator",":=");if("!"===a&&"="===e.charAt(t+1))return t+=2,n("operator","!=");if(">"===a&&"="===e.charAt(t+1))return t+=2,n("operator",">=");if("<"===a&&"="===e.charAt(t+1))return t+=2,n("operator","<=");if("*"===a&&"*"===e.charAt(t+1))return t+=2,n("operator","**");if("~"===a&&">"===e.charAt(t+1))return t+=2,n("operator","~>");if(z.hasOwnProperty(a))return t++,n("operator",a);if('"'===a||"'"===a){var i=a;t++;for(var s="";t<r;){if("\\"===(a=e.charAt(t)))if(t++,a=e.charAt(t),q.hasOwnProperty(a))s+=q[a];else{if("u"!==a)throw{code:"S0103",stack:(new Error).stack,position:t,token:a};var u=e.substr(t+1,4);if(!/^[0-9a-fA-F]+$/.test(u))throw{code:"S0104",stack:(new Error).stack,position:t};var c=parseInt(u,16);s+=String.fromCharCode(c),t+=4}else{if(a===i)return t++,n("string",s);s+=a}t++}throw{code:"S0101",stack:(new Error).stack,position:t}}var f,l=/^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?/.exec(e.substring(t));if(null!==l){var p=parseFloat(l[0]);if(!isNaN(p)&&isFinite(p))return t+=l[0].length,n("number",p);throw{code:"S0102",stack:(new Error).stack,position:t,token:l[0]}}if("`"===a){t++;var d=e.indexOf("`",t);if(-1!==d)return f=e.substring(t,d),t=d+1,n("name",f);throw t=r,{code:"S0105",stack:(new Error).stack,position:t}}for(var h,b=t;;)if(h=e.charAt(b),b===r||" \t\n\r\v".indexOf(h)>-1||z.hasOwnProperty(h)){if("$"===e.charAt(t))return f=e.substring(t+1,b),t=b,n("variable",f);switch(f=e.substring(t,b),t=b,f){case"or":case"in":case"and":return n("operator",f);case"true":return n("value",!0);case"false":return n("value",!1);case"null":return n("value",null);default:return t===r&&""===f?null:n("name",f)}}else b++}};function J(e){for(var t=1,r=[],n={},o=n;t<e.length;){var a=e.charAt(t);if(":"===a)break;var i=function(){r.push(n),o=n,n={}},s=function(e,t,r,n){for(var o=1,i=t;i<e.length;)if(i++,(a=e.charAt(i))===n){if(0===--o)break}else a===r&&o++;return i};switch(a){case"s":case"n":case"b":case"l":case"o":n.regex="["+a+"m]",n.type=a,i();break;case"a":n.regex="[asnblfom]",n.type=a,n.array=!0,i();break;case"f":n.regex="f",n.type=a,i();break;case"j":n.regex="[asnblom]",n.type=a,i();break;case"x":n.regex="[asnblfom]",n.type=a,i();break;case"-":o.context=!0,o.contextRegex=new RegExp(o.regex),o.regex+="?";break;case"?":case"+":o.regex+=a;break;case"(":var u=s(e,t,"(",")"),c=e.substring(t+1,u);if(-1!==c.indexOf("<"))throw{code:"S0402",stack:(new Error).stack,value:c,offset:t};n.regex="["+c+"m]",n.type="("+c+")",t=u,i();break;case"<":if("a"!==o.type&&"f"!==o.type)throw{code:"S0401",stack:(new Error).stack,value:o.type,offset:t};var f=s(e,t,"<",">");o.subtype=e.substring(t+1,f),t=f}t++}var l="^"+r.map(function(e){return"("+e.regex+")"}).join("")+"$",p=new RegExp(l),d=function(e){var t;if(Ee(e))t="f";else switch(void 0===e?"undefined":h(e)){case"string":t="s";break;case"number":t="n";break;case"boolean":t="b";break;case"object":t=null===e?"l":Array.isArray(e)?"a":"o";break;case"undefined":default:t="m"}return t};return{definition:e,validate:function(e,t){var n="";e.forEach(function(e){n+=d(e)});var o=p.exec(n);if(o){var a=[],i=0;return r.forEach(function(r,n){var s=e[i],u=o[n+1];if(""===u)if(r.context&&r.contextRegex){var c=d(t);if(!r.contextRegex.test(c))throw{code:"T0411",stack:(new Error).stack,value:t,index:i+1};a.push(t)}else a.push(s),i++;else u.split("").forEach(function(t){if("a"===r.type){if("m"===t)s=void 0;else{s=e[i];var n=!0;if(void 0!==r.subtype)if("a"!==t&&u!==r.subtype)n=!1;else if("a"===t&&s.length>0){var o=d(s[0]);if(o!==r.subtype.charAt(0))n=!1;else n=0===s.filter(function(e){return d(e)!==o}).length}if(!n)throw{code:"T0412",stack:(new Error).stack,value:s,index:i+1,type:r.subtype};"a"!==t&&(s=[s])}a.push(s),i++}else a.push(s),i++})}),a}!function(e,t){for(var n="^",o=0,a=0;a<r.length;a++){n+=r[a].regex;var i=t.match(n);if(null===i)throw{code:"T0410",stack:(new Error).stack,value:e[o],index:o+1};o=i[0].length}throw{code:"T0410",stack:(new Error).stack,value:e[o],index:o+1}}(e,n)}}}var B=function(e,t){var r,n,o={},a=[],i=function(){var e=[];"(end)"!==r.id&&e.push({type:r.type,value:r.value,position:r.position});for(var t=n();null!==t;)e.push(t),t=n();return e},s={nud:function(){var e={code:"S0211",token:this.value,position:this.position};if(t)return e.remaining=i(),e.type="error",a.push(e),e;throw e.stack=(new Error).stack,e}},u=function(e,t){var r=o[e];return t=t||0,r?t>=r.lbp&&(r.lbp=t):((r=(0,d.default)(s)).id=r.value=e,r.lbp=t,o[e]=r),r},c=function(e){if(t){e.remaining=i(),a.push(e);var n=o["(error)"];return(r=(0,d.default)(n)).error=e,r.type="(error)",r}throw e.stack=(new Error).stack,e},f=function(t,a){if(t&&r.id!==t){var i={code:"(end)"===r.id?"S0203":"S0202",position:r.position,token:r.value,value:t};return c(i)}var s=n(a);if(null===s)return(r=o["(end)"]).position=e.length,r;var u,f=s.value,l=s.type;switch(l){case"name":case"variable":u=o["(name)"];break;case"operator":if(!(u=o[f]))return c({code:"S0204",stack:(new Error).stack,position:s.position,token:f});break;case"string":case"number":case"value":u=o["(literal)"];break;case"regex":l="regex",u=o["(regex)"];break;default:return c({code:"S0205",stack:(new Error).stack,position:s.position,token:f})}return(r=(0,d.default)(u)).value=f,r.type=l,r.position=s.position,r},l=function(e){var t,n=r;for(f(null,!0),t=n.nud();e<r.lbp;)n=r,f(),t=n.led(t);return t},p=function(e){u(e,0).nud=function(){return this}},h=function(e,t,r){var n=t||z[e],o=u(e,n);return o.led=r||function(e){return this.lhs=e,this.rhs=l(n),this.type="binary",this},o},b=function(e,t,r){var n=u(e,t);return n.led=r,n},v=function(e,t){var r=u(e);return r.nud=t||function(){return this.expression=l(70),this.type="unary",this},r};p("(end)"),p("(name)"),p("(literal)"),p("(regex)"),u(":"),u(";"),u(","),u(")"),u("]"),u("}"),u(".."),h("."),h("+"),h("-"),h("*"),h("/"),h("%"),h("="),h("<"),h(">"),h("!="),h("<="),h(">="),h("&"),h("and"),h("or"),h("in"),p("and"),p("or"),p("in"),v("-"),h("~>"),b("(error)",10,function(e){return this.lhs=e,this.error=r.error,this.remaining=i(),this.type="error",this}),v("*",function(){return this.type="wildcard",this}),v("**",function(){return this.type="descendant",this}),h("(",z["("],function(e){if(this.procedure=e,this.type="function",this.arguments=[],")"!==r.id)for(;"operator"===r.type&&"?"===r.id?(this.type="partial",this.arguments.push(r),f("?")):this.arguments.push(l(0)),","===r.id;)f(",");if(f(")",!0),"name"===e.type&&("function"===e.value||"λ"===e.value)){if(this.arguments.forEach(function(e,t){if("variable"!==e.type)return c({code:"S0208",stack:(new Error).stack,position:e.position,token:e.value,value:t+1})}),this.type="lambda","<"===r.id){for(var t=r.position,n=1,o="<";n>0&&"{"!==r.id&&"(end)"!==r.id;){var a=f();">"===a.id?n--:"<"===a.id&&n++,o+=a.value}f(">");try{this.signature=J(o)}catch(e){return e.position=t+e.offset,c(e)}}f("{"),this.body=l(0),f("}")}return this}),v("(",function(){for(var e=[];")"!==r.id&&(e.push(l(0)),";"===r.id);)f(";");return f(")",!0),this.type="block",this.expressions=e,this}),v("[",function(){var e=[];if("]"!==r.id)for(;;){var t=l(0);if(".."===r.id){var n={type:"binary",value:"..",position:r.position,lhs:t};f(".."),n.rhs=l(0),t=n}if(e.push(t),","!==r.id)break;f(",")}return f("]",!0),this.expressions=e,this.type="unary",this}),h("[",z["["],function(e){if("]"===r.id){for(var t=e;t&&"binary"===t.type&&"["===t.value;)t=t.lhs;return t.keepArray=!0,f("]"),e}return this.lhs=e,this.rhs=l(z["]"]),this.type="binary",f("]",!0),this}),h("^",z["^"],function(e){f("(");for(var t=[];;){var n={descending:!1};if("<"===r.id?f("<"):">"===r.id&&(n.descending=!0,f(">")),n.expression=l(0),t.push(n),","!==r.id)break;f(",")}return f(")"),this.lhs=e,this.rhs=t,this.type="binary",this});var g=function(e){var t=[];if("}"!==r.id)for(;;){var n=l(0);f(":");var o=l(0);if(t.push([n,o]),","!==r.id)break;f(",")}return f("}",!0),void 0===e?(this.lhs=t,this.type="unary"):(this.lhs=e,this.rhs=t,this.type="binary"),this};v("{",g),h("{",z["{"],g),b(":=",z[":="],function(e){return"variable"!==e.type?c({code:"S0212",stack:(new Error).stack,position:e.position,token:e.value}):(this.lhs=e,this.rhs=l(z[":="]-1),this.type="binary",this)}),h("?",z["?"],function(e){return this.type="condition",this.condition=e,this.then=l(0),":"===r.id&&(f(":"),this.else=l(0)),this}),v("|",function(){return this.type="transform",this.pattern=l(0),f("|"),this.update=l(0),","===r.id&&(f(","),this.delete=l(0)),f("|"),this});n=U(e),f();var m=l(0);if("(end)"!==r.id){var y={code:"S0201",position:r.position,token:r.value};c(y)}return m=function e(r){var n;switch(r.type){case"binary":switch(r.value){case".":var o=e(r.lhs);n={type:"path",steps:[]},"path"===o.type?Array.prototype.push.apply(n.steps,o.steps):n.steps=[o];var i=e(r.rhs);"function"===i.type&&"path"===i.procedure.type&&1===i.procedure.steps.length&&"name"===i.procedure.steps[0].type&&"function"===n.steps[n.steps.length-1].type&&(n.steps[n.steps.length-1].nextFunction=i.procedure.steps[0].value),"path"!==i.type&&(i={type:"path",steps:[i]}),Array.prototype.push.apply(n.steps,i.steps),n.steps.filter(function(e){if("number"===e.type||"value"===e.type)throw{code:"S0213",stack:(new Error).stack,position:e.position,value:e.value};return"string"===e.type}).forEach(function(e){e.type="name"}),n.steps.filter(function(e){return!0===e.keepArray}).length>0&&(n.keepSingletonArray=!0);var s=n.steps[0];"unary"===s.type&&"["===s.value&&(s.consarray=!0);var u=n.steps[n.steps.length-1];"unary"===u.type&&"["===u.value&&(u.consarray=!0);break;case"[":var c=n=e(r.lhs);if("path"===n.type&&(c=n.steps[n.steps.length-1]),void 0!==c.group)throw{code:"S0209",stack:(new Error).stack,position:r.position};void 0===c.predicate&&(c.predicate=[]),c.predicate.push(e(r.rhs));break;case"{":if(void 0!==(n=e(r.lhs)).group)throw{code:"S0210",stack:(new Error).stack,position:r.position};n.group={lhs:r.rhs.map(function(t){return[e(t[0]),e(t[1])]}),position:r.position};break;case"^":(n={type:"sort",value:r.value,position:r.position,consarray:!0}).lhs=e(r.lhs),n.rhs=r.rhs.map(function(t){return{descending:t.descending,expression:e(t.expression)}});break;case":=":(n={type:"bind",value:r.value,position:r.position}).lhs=e(r.lhs),n.rhs=e(r.rhs);break;case"~>":(n={type:"apply",value:r.value,position:r.position}).lhs=e(r.lhs),n.rhs=e(r.rhs);break;default:(n={type:r.type,value:r.value,position:r.position}).lhs=e(r.lhs),n.rhs=e(r.rhs)}break;case"unary":n={type:r.type,value:r.value,position:r.position},"["===r.value?n.expressions=r.expressions.map(function(t){return e(t)}):"{"===r.value?n.lhs=r.lhs.map(function(t){return[e(t[0]),e(t[1])]}):(n.expression=e(r.expression),"-"===r.value&&"number"===n.expression.type&&((n=n.expression).value=-n.value));break;case"function":case"partial":(n={type:r.type,name:r.name,value:r.value,position:r.position}).arguments=r.arguments.map(function(t){return e(t)}),n.procedure=e(r.procedure);break;case"lambda":n={type:r.type,arguments:r.arguments,signature:r.signature,position:r.position};var f=e(r.body);n.body=function e(t){var r;if("function"!==t.type||t.predicate)if("condition"===t.type)t.then=e(t.then),void 0!==t.else&&(t.else=e(t.else)),r=t;else if("block"===t.type){var n=t.expressions.length;n>0&&(t.expressions[n-1]=e(t.expressions[n-1])),r=t}else r=t;else{var o={type:"lambda",thunk:!0,arguments:[],position:t.position};o.body=t,r=o}return r}(f);break;case"condition":(n={type:r.type,position:r.position}).condition=e(r.condition),n.then=e(r.then),void 0!==r.else&&(n.else=e(r.else));break;case"transform":(n={type:r.type,position:r.position}).pattern=e(r.pattern),n.update=e(r.update),void 0!==r.delete&&(n.delete=e(r.delete));break;case"block":(n={type:r.type,position:r.position}).expressions=r.expressions.map(function(t){var r=e(t);return(r.consarray||"path"===r.type&&r.steps[0].consarray)&&(n.consarray=!0),r});break;case"name":n={type:"path",steps:[r]},r.keepArray&&(n.keepSingletonArray=!0);break;case"string":case"number":case"value":case"wildcard":case"descendant":case"variable":case"regex":n=r;break;case"operator":if("and"===r.value||"or"===r.value||"in"===r.value)r.type="name",n=e(r);else{if("?"!==r.value)throw{code:"S0201",stack:(new Error).stack,position:r.position,token:r.value};n=r}break;case"error":n=r,r.lhs&&(n=e(r.lhs));break;default:var l="S0206";"(end)"===r.id&&(l="S0207");var p={code:l,position:r.position,token:r.value};if(t)return a.push(p),{type:"error",error:p};throw p.stack=(new Error).stack,p}return n}(m),a.length>0&&(m.errors=a),m},W=at(null);function V(e){var t=!1;if("number"==typeof e&&(t=!isNaN(e))&&!isFinite(e))throw{code:"D1001",value:e,stack:(new Error).stack};return t}function K(e){var t=!1;return Array.isArray(e)&&(t=0===e.filter(function(e){return"string"!=typeof e}).length),t}function H(e){var t=!1;return Array.isArray(e)&&(t=0===e.filter(function(e){return!V(e)}).length),t}function Q(t,r,n){var o,a,i;return f.default.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:(a=n.lookup("__evaluate_entry"))&&a(t,r,n),e.t0=t.type,e.next="path"===e.t0?5:"binary"===e.t0?8:"unary"===e.t0?11:"name"===e.t0?14:"string"===e.t0?16:"number"===e.t0?16:"value"===e.t0?16:"wildcard"===e.t0?18:"descendant"===e.t0?20:"condition"===e.t0?22:"block"===e.t0?25:"bind"===e.t0?28:"regex"===e.t0?31:"function"===e.t0?33:"variable"===e.t0?36:"lambda"===e.t0?38:"partial"===e.t0?40:"apply"===e.t0?43:"sort"===e.t0?46:"transform"===e.t0?49:51;break;case 5:return e.delegateYield(ee(t,r,n),"t1",6);case 6:return o=e.t1,e.abrupt("break",51);case 8:return e.delegateYield(oe(t,r,n),"t2",9);case 9:return o=e.t2,e.abrupt("break",51);case 11:return e.delegateYield(ae(t,r,n),"t3",12);case 12:return o=e.t3,e.abrupt("break",51);case 14:return o=ie(t,r,n),e.abrupt("break",51);case 16:return o=se(t),e.abrupt("break",51);case 18:return o=ue(t,r),e.abrupt("break",51);case 20:return o=ce(t,r),e.abrupt("break",51);case 22:return e.delegateYield(me(t,r,n),"t4",23);case 23:return o=e.t4,e.abrupt("break",51);case 25:return e.delegateYield(ye(t,r,n),"t5",26);case 26:return o=e.t5,e.abrupt("break",51);case 28:return e.delegateYield(ge(t,r,n),"t6",29);case 29:return o=e.t6,e.abrupt("break",51);case 31:return o=_e(t),e.abrupt("break",51);case 33:return e.delegateYield(Pe(t,r,n),"t7",34);case 34:return o=e.t7,e.abrupt("break",51);case 36:return o=ke(t,r,n),e.abrupt("break",51);case 38:return o=Me(t,r,n),e.abrupt("break",51);case 40:return e.delegateYield(Le(t,r,n),"t8",41);case 41:return o=e.t8,e.abrupt("break",51);case 43:return e.delegateYield(Oe(t,r,n),"t9",44);case 44:return o=e.t9,e.abrupt("break",51);case 46:return e.delegateYield(we(t,r,n),"t10",47);case 47:return o=e.t10,e.abrupt("break",51);case 49:return o=je(t,r,n),e.abrupt("break",51);case 51:if(!n.lookup("__jsonata_async")||void 0!==o&&null!==o&&"function"==typeof o.then||(o=l.default.resolve(o)),!n.lookup("__jsonata_async")||"function"!=typeof o.then||!t.nextFunction||"function"!=typeof o[t.nextFunction]){e.next=55;break}e.next=58;break;case 55:return e.next=57,o;case 57:o=e.sent;case 58:if(!t.hasOwnProperty("predicate")){e.next=61;break}return e.delegateYield(re(t.predicate,o,n),"t11",60);case 60:o=e.t11;case 61:if(!t.hasOwnProperty("group")){e.next=64;break}return e.delegateYield(be(t.group,o,n),"t12",63);case 63:o=e.t12;case 64:return(i=n.lookup("__evaluate_exit"))&&i(t,r,n,o),o&&o.sequence&&(o=o.value()),e.abrupt("return",o);case 68:case"end":return e.stop()}},e,this)}function Z(){var e=X([]);return 1===arguments.length&&e.push(arguments[0]),e}function X(e){return Object.defineProperty(e,"sequence",{enumerable:!1,configurable:!1,get:function(){return!0}}),Object.defineProperty(e,"keepSingleton",{enumerable:!1,configurable:!1,writable:!0,value:!1}),Object.defineProperty(e,"value",{enumerable:!1,configurable:!1,get:function(){return function(){switch(this.length){case 0:return;case 1:return this.keepSingleton?this:this[0];default:return this}}}}),e}function ee(e,r,n){var o,a,i,s;return f.default.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:o="variable"===e.steps[0].type?Z(r):Array.isArray(r)?r:Z(r),i=0;case 2:if(!(i<e.steps.length)){t.next=18;break}if(s=e.steps[i],0!==i||!s.consarray){t.next=10;break}return t.delegateYield(Q(s,o,n),"t0",6);case 6:a=t.t0,Array.isArray(a)||(a=Z(a)),t.next=12;break;case 10:return t.delegateYield(te(s,o,n,i===e.steps.length-1),"t1",11);case 11:a=t.t1;case 12:if(void 0!==a&&0!==a.length){t.next=14;break}return t.abrupt("break",18);case 14:o=a;case 15:i++,t.next=2;break;case 18:return e.keepSingletonArray&&(a.keepSingleton=!0),t.abrupt("return",a);case 20:case"end":return t.stop()}},t,this)}function te(e,t,r,o){var a,i,s,u;return f.default.wrap(function(n){for(;;)switch(n.prev=n.next){case 0:a=Z(),i=0;case 2:if(!(i<t.length)){n.next=9;break}return n.delegateYield(Q(e,t[i],r),"t0",4);case 4:void 0!==(s=n.t0)&&a.push(s);case 6:i++,n.next=2;break;case 9:return u=Z(),o&&1===a.length&&Array.isArray(a[0])&&!a[0].sequence?u=a[0]:a.forEach(function(e){!Array.isArray(e)||e.cons||e.keepSingleton?u.push(e):Array.prototype.push.apply(u,e)}),n.abrupt("return",u);case 12:case"end":return n.stop()}},n,this)}function re(e,t,r){var n,o,a,i,s;return f.default.wrap(function(u){for(;;)switch(u.prev=u.next){case 0:n=t,o=Z(),a=0;case 3:if(!(a<e.length)){u.next=19;break}if(i=e[a],Array.isArray(n)||(n=Z(n)),o=Z(),"number"!==i.type){u.next=13;break}(s=Math.floor(i.value))<0&&(s=n.length+s),o=n[s],u.next=15;break;case 13:return u.delegateYield(ne(i,n,r),"t0",14);case 14:o=u.t0;case 15:n=o;case 16:a++,u.next=3;break;case 19:return u.abrupt("return",o);case 20:case"end":return u.stop()}},b,this)}function ne(e,t,r){var n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:n=Z(),o=0;case 2:if(!(o<t.length)){s.next=11;break}return a=t[o],s.delegateYield(Q(e,a,r),"t0",5);case 5:V(i=s.t0)&&(i=[i]),H(i)?i.forEach(function(e){var r=Math.floor(e);r<0&&(r=t.length+r),r===o&&n.push(a)}):He(i)&&n.push(a);case 8:o++,s.next=2;break;case 11:return s.abrupt("return",n);case 12:case"end":return s.stop()}},v,this)}function oe(e,t,r){var n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:return s.delegateYield(Q(e.lhs,t,r),"t0",1);case 1:return o=s.t0,s.delegateYield(Q(e.rhs,t,r),"t1",3);case 3:a=s.t1,i=e.value,s.prev=5,s.t2=i,s.next="+"===s.t2?9:"-"===s.t2?9:"*"===s.t2?9:"/"===s.t2?9:"%"===s.t2?9:"="===s.t2?11:"!="===s.t2?11:"<"===s.t2?11:"<="===s.t2?11:">"===s.t2?11:">="===s.t2?11:"&"===s.t2?13:"and"===s.t2?15:"or"===s.t2?15:".."===s.t2?17:"in"===s.t2?19:21;break;case 9:return n=fe(o,a,i),s.abrupt("break",21);case 11:return n=le(o,a,i),s.abrupt("break",21);case 13:return n=he(o,a),s.abrupt("break",21);case 15:return n=de(o,a,i),s.abrupt("break",21);case 17:return n=ve(o,a),s.abrupt("break",21);case 19:return n=pe(o,a),s.abrupt("break",21);case 21:s.next=28;break;case 23:throw s.prev=23,s.t3=s.catch(5),s.t3.position=e.position,s.t3.token=i,s.t3;case 28:return s.abrupt("return",n);case 29:case"end":return s.stop()}},g,this,[[5,23]])}function ae(e,t,r){var n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:s.t0=e.value,s.next="-"===s.t0?3:"["===s.t0?15:"{"===s.t0?27:30;break;case 3:return s.delegateYield(Q(e.expression,t,r),"t1",4);case 4:if(void 0!==(n=s.t1)){s.next=9;break}n=void 0,s.next=14;break;case 9:if(!V(n)){s.next=13;break}n=-n,s.next=14;break;case 13:throw{code:"D1002",stack:(new Error).stack,position:e.position,token:e.value,value:n};case 14:return s.abrupt("break",30);case 15:n=[],o=0;case 17:if(!(o<e.expressions.length)){s.next=25;break}return a=e.expressions[o],s.delegateYield(Q(a,t,r),"t2",20);case 20:void 0!==(i=s.t2)&&("["===a.value?n.push(i):n=et(n,i));case 22:o++,s.next=17;break;case 25:return e.consarray&&Object.defineProperty(n,"cons",{enumerable:!1,configurable:!1,value:!0}),s.abrupt("break",30);case 27:return s.delegateYield(be(e,t,r),"t3",28);case 28:return n=s.t3,s.abrupt("break",30);case 30:return s.abrupt("return",n);case 31:case"end":return s.stop()}},m,this)}function ie(e,t,r){var n;if(Array.isArray(t)){n=Z();for(var o=0;o<t.length;o++){var a=ie(e,t[o],r);void 0!==a&&n.push(a)}}else null!==t&&"object"===(void 0===t?"undefined":h(t))&&(n=t[e.value]);return n}function se(e){return e.value}function ue(e,t){var r=Z();return null!==t&&"object"===(void 0===t?"undefined":h(t))&&(0,c.default)(t).forEach(function(e){var n=t[e];Array.isArray(n)?(n=function e(t,r){void 0===r&&(r=[]);Array.isArray(t)?t.forEach(function(t){e(t,r)}):r.push(t);return r}(n),r=et(r,n)):r.push(n)}),r}function ce(e,t){var r,n=Z();return void 0!==t&&(!function e(t,r){Array.isArray(t)||r.push(t);Array.isArray(t)?t.forEach(function(t){e(t,r)}):null!==t&&"object"===(void 0===t?"undefined":h(t))&&(0,c.default)(t).forEach(function(n){e(t[n],r)})}(t,n),r=1===n.length?n[0]:n),r}function fe(e,t,r){var n;if(void 0===e||void 0===t)return n;if(!V(e))throw{code:"T2001",stack:(new Error).stack,value:e};if(!V(t))throw{code:"T2002",stack:(new Error).stack,value:t};switch(r){case"+":n=e+t;break;case"-":n=e-t;break;case"*":n=e*t;break;case"/":n=e/t;break;case"%":n=e%t}return n}function le(e,t,r){var n,o=void 0===e?"undefined":h(e),a=void 0===t?"undefined":h(t);if("undefined"===o||"undefined"===a)return!1;var i=function(){if("string"!==o&&"number"!==o||"string"!==a&&"number"!==a)throw{code:"T2010",stack:(new Error).stack,value:"string"!==o&&"number"!==o?e:t};if(o!==a)throw{code:"T2009",stack:(new Error).stack,value:e,value2:t}};switch(r){case"=":n=e===t;break;case"!=":n=e!==t;break;case"<":i(),n=e<t;break;case"<=":i(),n=e<=t;break;case">":i(),n=e>t;break;case">=":i(),n=e>=t}return n}function pe(e,t){var r=!1;if(void 0===e||void 0===t)return!1;Array.isArray(t)||(t=[t]);for(var n=0;n<t.length;n++)if(t[n]===e){r=!0;break}return r}function de(e,t,r){var n;switch(r){case"and":n=He(e)&&He(t);break;case"or":n=He(e)||He(t)}return n}function he(e,t){var r="",n="";return void 0!==e&&(r=ze(e)),void 0!==t&&(n=ze(t)),r.concat(n)}function be(e,t,r){var n,o,a,i,s,u,c,l,p;return f.default.wrap(function(d){for(;;)switch(d.prev=d.next){case 0:n={},o={},Array.isArray(t)||(t=Z(t)),a=0;case 4:if(!(a<t.length)){d.next=27;break}i=t[a],s=0;case 7:if(!(s<e.lhs.length)){d.next=24;break}return u=e.lhs[s],d.delegateYield(Q(u[0],i,r),"t0",10);case 10:if("string"==typeof(c=d.t0)){d.next=13;break}throw{code:"T1003",stack:(new Error).stack,position:e.position,value:c};case 13:if(l={data:i,exprIndex:s},!o.hasOwnProperty(c)){d.next=20;break}if(o[c].exprIndex===s){d.next=17;break}throw{code:"D1009",stack:(new Error).stack,position:e.position,value:c};case 17:o[c].data=et(o[c].data,i),d.next=21;break;case 20:o[c]=l;case 21:s++,d.next=7;break;case 24:a++,d.next=4;break;case 27:d.t1=f.default.keys(o);case 28:if((d.t2=d.t1()).done){d.next=36;break}return c=d.t2.value,l=o[c],d.delegateYield(Q(e.lhs[l.exprIndex][1],l.data,r),"t3",32);case 32:void 0!==(p=d.t3)&&(n[c]=p),d.next=28;break;case 36:return d.abrupt("return",n);case 37:case"end":return d.stop()}},y,this)}function ve(e,t){var r;if(void 0===e||void 0===t)return r;if(e>t)return r;if(!(0,p.default)(e))throw{code:"T2003",stack:(new Error).stack,value:e};if(!(0,p.default)(t))throw{code:"T2004",stack:(new Error).stack,value:t};r=new Array(t-e+1);for(var n=e,o=0;n<=t;n++,o++)r[o]=n;return X(r)}function ge(e,t,r){var n;return f.default.wrap(function(o){for(;;)switch(o.prev=o.next){case 0:return o.delegateYield(Q(e.rhs,t,r),"t0",1);case 1:return n=o.t0,r.bind(e.lhs.value,n),o.abrupt("return",n);case 4:case"end":return o.stop()}},_,this)}function me(e,t,r){var n;return f.default.wrap(function(o){for(;;)switch(o.prev=o.next){case 0:return o.delegateYield(Q(e.condition,t,r),"t0",1);case 1:if(!He(o.t0)){o.next=7;break}return o.delegateYield(Q(e.then,t,r),"t1",4);case 4:n=o.t1,o.next=10;break;case 7:if(void 0===e.else){o.next=10;break}return o.delegateYield(Q(e.else,t,r),"t2",9);case 9:n=o.t2;case 10:return o.abrupt("return",n);case 11:case"end":return o.stop()}},x,this)}function ye(e,t,r){var n,o,a;return f.default.wrap(function(i){for(;;)switch(i.prev=i.next){case 0:o=at(r),a=0;case 2:if(!(a<e.expressions.length)){i.next=8;break}return i.delegateYield(Q(e.expressions[a],t,o),"t0",4);case 4:n=i.t0;case 5:a++,i.next=2;break;case 8:return i.abrupt("return",n);case 9:case"end":return i.stop()}},k,this)}function _e(e){var t=new RegExp(e.value);return function r(n){var o,a=t.exec(n);if(null!==a){if(o={match:a[0],start:a.index,end:a.index+a[0].length,groups:[]},a.length>1)for(var i=1;i<a.length;i++)o.groups.push(a[i]);o.next=function(){if(!(t.lastIndex>=n.length)){var o=r(n);if(o&&""===o.match)throw{code:"D1004",stack:(new Error).stack,position:e.position,value:e.value.source};return o}}}return o}}function xe(e,t){var r;return f.default.wrap(function(n){for(;;)switch(n.prev=n.next){case 0:return n.delegateYield(Ye(e,[t],null),"t0",1);case 1:if(!(r=n.t0)||"number"==typeof r.start||"number"===r.end||Array.isArray(r.groups)||Ee(r.next)){n.next=4;break}throw{code:"T1010",stack:(new Error).stack};case 4:return n.abrupt("return",r);case 5:case"end":return n.stop()}},w,this)}function ke(e,t,r){return""===e.value?t:r.lookup(e.value)}function we(e,t,r){var n,o,a;return f.default.wrap(function(i){for(;;)switch(i.prev=i.next){case 0:return i.delegateYield(Q(e.lhs,t,r),"t0",1);case 1:return o=i.t0,a=f.default.mark(function t(n,o){var a,i,s,u,c,l,p;return f.default.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:a=0,i=0;case 2:if(!(0===a&&i<e.rhs.length)){t.next=29;break}return s=e.rhs[i],t.delegateYield(Q(s.expression,n,r),"t0",5);case 5:return u=t.t0,t.delegateYield(Q(s.expression,o,r),"t1",7);case 7:if(c=t.t1,l=void 0===u?"undefined":h(u),p=void 0===c?"undefined":h(c),"undefined"!==l){t.next=13;break}return a="undefined"===p?0:1,t.abrupt("continue",26);case 13:if("undefined"!==p){t.next=16;break}return a=-1,t.abrupt("continue",26);case 16:if(!("string"!==l&&"number"!==l||"string"!==p&&"number"!==p)){t.next=18;break}throw{code:"T2008",stack:(new Error).stack,position:e.position,value:"string"!==l&&"number"!==l?u:c};case 18:if(l===p){t.next=20;break}throw{code:"T2007",stack:(new Error).stack,position:e.position,value:u,value2:c};case 20:if(u!==c){t.next=24;break}return t.abrupt("continue",26);case 24:a=u<c?-1:1;case 25:!0===s.descending&&(a=-a);case 26:i++,t.next=2;break;case 29:return t.abrupt("return",1===a);case 30:case"end":return t.stop()}},t,this)}),i.delegateYield(rt(o,a),"t1",4);case 4:return n=i.t1,i.abrupt("return",n);case 6:case"end":return i.stop()}},j,this)}function je(e,t,r){return $e(f.default.mark(function t(n){var o,a,i,s,u,c,l,p,d,b,v;return f.default.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:if(void 0!==n){t.next=2;break}return t.abrupt("return",void 0);case 2:if(Ee(o=r.lookup("clone"))){t.next=5;break}throw{code:"T2013",stack:(new Error).stack,position:e.position};case 5:return t.delegateYield(Ye(o,[n],null),"t0",6);case 6:return a=t.t0,t.delegateYield(Q(e.pattern,a,r),"t1",8);case 8:if(void 0===(i=t.t1)){t.next=33;break}Array.isArray(i)||(i=[i]),s=0;case 12:if(!(s<i.length)){t.next=33;break}return u=i[s],t.delegateYield(Q(e.update,u,r),"t2",15);case 15:if(c=t.t2,"undefined"===(l=void 0===c?"undefined":h(c))){t.next=21;break}if("object"===l&&null!==c){t.next=20;break}throw{code:"T2011",stack:(new Error).stack,position:e.update.position,value:c};case 20:for(p in c)u[p]=c[p];case 21:if(void 0===e.delete){t.next=30;break}return t.delegateYield(Q(e.delete,u,r),"t3",23);case 23:if(void 0===(d=t.t3)){t.next=30;break}if(b=d,Array.isArray(d)||(d=[d]),K(d)){t.next=29;break}throw{code:"T2012",stack:(new Error).stack,position:e.delete.position,value:b};case 29:for(v=0;v<d.length;v++)delete u[d[v]];case 30:s++,t.next=12;break;case 33:return t.abrupt("return",a);case 34:case"end":return t.stop()}},t,this)}),"<(oa):o>")}Number.isInteger=p.default||function(e){return"number"==typeof e&&isFinite(e)&&Math.floor(e)===e};var Se=B("function($f, $g) { function($x){ $g($f($x)) } }");function Oe(e,t,r){var n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:if("function"!==e.rhs.type){s.next=7;break}return e.rhs.arguments.unshift(e.lhs),s.delegateYield(Pe(e.rhs,t,r),"t0",3);case 3:n=s.t0,e.rhs.arguments.shift(),s.next=22;break;case 7:return s.delegateYield(Q(e.lhs,t,r),"t1",8);case 8:return o=s.t1,s.delegateYield(Q(e.rhs,t,r),"t2",10);case 10:if(Ee(a=s.t2)){s.next=13;break}throw{code:"T2006",stack:(new Error).stack,position:e.position,value:a};case 13:if(!Ee(o)){s.next=20;break}return s.delegateYield(Q(Se,null,r),"t3",15);case 15:return i=s.t3,s.delegateYield(Ye(i,[o,a],null),"t4",17);case 17:n=s.t4,s.next=22;break;case 20:return s.delegateYield(Ye(a,[o],null),"t5",21);case 21:n=s.t5;case 22:return s.abrupt("return",n);case 23:case"end":return s.stop()}},S,this)}function Ee(e){return e&&(!0===e._jsonata_function||!0===e._jsonata_lambda)||"function"==typeof e}function Ae(e){return e&&!0===e._jsonata_lambda}function Te(e){return"object"===(void 0===e?"undefined":h(e))&&null!==e&&(0,u.default)(e)&&"function"==typeof e[s.default]&&"next"in e&&"function"==typeof e.next}function Pe(e,t,r){var n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:return s.delegateYield(Q(e.procedure,t,r),"t0",1);case 1:if(void 0!==(o=s.t0)||"path"!==e.procedure.type||!r.lookup(e.procedure.steps[0].value)){s.next=4;break}throw{code:"T1005",stack:(new Error).stack,position:e.position,token:e.procedure.steps[0].value};case 4:a=[],i=0;case 6:if(!(i<e.arguments.length)){s.next=14;break}return s.t1=a,s.delegateYield(Q(e.arguments[i],t,r),"t2",9);case 9:s.t3=s.t2,s.t1.push.call(s.t1,s.t3);case 11:i++,s.next=6;break;case 14:return s.prev=14,s.delegateYield(Ye(o,a,t),"t4",16);case 16:n=s.t4,s.next=24;break;case 19:throw s.prev=19,s.t5=s.catch(14),s.t5.position=e.position,s.t5.token="path"===e.procedure.type?e.procedure.steps[0].value:e.procedure.value,s.t5;case 24:return s.abrupt("return",n);case 25:case"end":return s.stop()}},O,this,[[14,19]])}function Ye(e,t,r){var n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:return s.delegateYield(De(e,t,r),"t0",1);case 1:n=s.t0;case 2:if(!Ae(n)||!0!==n.thunk){s.next=19;break}return s.delegateYield(Q(n.body.procedure,n.input,n.environment),"t1",4);case 4:o=s.t1,a=[],i=0;case 7:if(!(i<n.body.arguments.length)){s.next=15;break}return s.t2=a,s.delegateYield(Q(n.body.arguments[i],n.input,n.environment),"t3",10);case 10:s.t4=s.t3,s.t2.push.call(s.t2,s.t4);case 12:i++,s.next=7;break;case 15:return s.delegateYield(De(o,a,r),"t5",16);case 16:n=s.t5,s.next=2;break;case 19:return s.abrupt("return",n);case 20:case"end":return s.stop()}},E,this)}function De(e,t,r){var n,o;return f.default.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:if(o=t,e&&(o=Ne(e.signature,t,r)),!Ae(e)){a.next=7;break}return a.delegateYield(Fe(e,o),"t0",4);case 4:n=a.t0,a.next=22;break;case 7:if(!e||!0!==e._jsonata_function){a.next=14;break}if(!Te(n=e.implementation.apply(r,o))){a.next=12;break}return a.delegateYield(n,"t1",11);case 11:n=a.t1;case 12:a.next=22;break;case 14:if("function"!=typeof e){a.next=21;break}if(!Te(n=e.apply(r,o))){a.next=19;break}return a.delegateYield(n,"t2",18);case 18:n=a.t2;case 19:a.next=22;break;case 21:throw{code:"T1006",stack:(new Error).stack};case 22:return a.abrupt("return",n);case 23:case"end":return a.stop()}},A,this)}function Me(e,t,r){var n={_jsonata_lambda:!0,input:t,environment:r,arguments:e.arguments,signature:e.signature,body:e.body};return!0===e.thunk&&(n.thunk=!0),n}function Le(e,t,r){var n,o,a,i,s;return f.default.wrap(function(u){for(;;)switch(u.prev=u.next){case 0:o=[],a=0;case 2:if(!(a<e.arguments.length)){u.next=15;break}if("operator"!==(i=e.arguments[a]).type||"?"!==i.value){u.next=8;break}o.push(i),u.next=12;break;case 8:return u.t0=o,u.delegateYield(Q(i,t,r),"t1",10);case 10:u.t2=u.t1,u.t0.push.call(u.t0,u.t2);case 12:a++,u.next=2;break;case 15:return u.delegateYield(Q(e.procedure,t,r),"t3",16);case 16:if(void 0!==(s=u.t3)||"path"!==e.procedure.type||!r.lookup(e.procedure.steps[0].value)){u.next=19;break}throw{code:"T1007",stack:(new Error).stack,position:e.position,token:e.procedure.steps[0].value};case 19:if(!Ae(s)){u.next=23;break}n=Ie(s,o),u.next=32;break;case 23:if(!s||!0!==s._jsonata_function){u.next=27;break}n=Re(s.implementation,o),u.next=32;break;case 27:if("function"!=typeof s){u.next=31;break}n=Re(s,o),u.next=32;break;case 31:throw{code:"T1008",stack:(new Error).stack,position:e.position,token:"path"===e.procedure.type?e.procedure.steps[0].value:e.procedure.value};case 32:return u.abrupt("return",n);case 33:case"end":return u.stop()}},T,this)}function Ne(e,t,r){return void 0===e?t:e.validate(t,r)}function Fe(e,t){var r,n;return f.default.wrap(function(o){for(;;)switch(o.prev=o.next){case 0:if(n=at(e.environment),e.arguments.forEach(function(e,r){n.bind(e.value,t[r])}),"function"!=typeof e.body){o.next=7;break}return o.delegateYield(Ce(e.body,n),"t0",4);case 4:r=o.t0,o.next=9;break;case 7:return o.delegateYield(Q(e.body,e.input,n),"t1",8);case 8:r=o.t1;case 9:return o.abrupt("return",r);case 10:case"end":return o.stop()}},P,this)}function Ie(e,t){var r=at(e.environment),n=[];return e.arguments.forEach(function(e,o){var a=t[o];a&&"operator"===a.type&&"?"===a.value?n.push(e):r.bind(e.value,a)}),{_jsonata_lambda:!0,input:e.input,environment:r,arguments:n,body:e.body}}function Re(e,t){var r=Ge(e),n="function("+(r=r.map(function(e){return"$"+e.trim()})).join(", ")+"){ _ }",o=B(n);return o.body=e,Ie(o,t)}function Ce(e,t){var r,n,o;return f.default.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:if(r=Ge(e),n=r.map(function(e){return t.lookup(e.trim())}),!Te(o=e.apply(null,n))){a.next=6;break}return a.delegateYield(o,"t0",5);case 5:o=a.t0;case 6:return a.abrupt("return",o);case 7:case"end":return a.stop()}},Y,this)}function Ge(e){var t=e.toString();return/\(([^)]*)\)/.exec(t)[1].split(",")}function $e(e,t){var r={_jsonata_function:!0,implementation:e};return void 0!==t&&(r.signature=J(t)),r}function ze(e){if(void 0!==e){var t;if("string"==typeof e)t=e;else if(Ee(e))t="";else{if("number"==typeof e&&!isFinite(e))throw{code:"D3001",value:e,stack:(new Error).stack};t=(0,i.default)(e,function(e,t){return void 0!==t&&null!==t&&t.toPrecision&&V(t)?Number(t.toPrecision(15)):t&&Ee(t)?"":t})}return t}}function qe(e,t,r){if(void 0!==e){var n=(0,a.default)(e),o=n.length;if(o+t<0&&(t=0),void 0!==r){if(r<=0)return"";var i=t>=0?t+r:o+t+r;return n.slice(t,i).join("")}return n.slice(t).join("")}}function Ue(e){if(void 0!==e)return(0,a.default)(e).length}function Je(e,t){var r,n;return f.default.wrap(function(o){for(;;)switch(o.prev=o.next){case 0:if(void 0!==e){o.next=2;break}return o.abrupt("return",void 0);case 2:if("string"!=typeof t){o.next=6;break}r=-1!==e.indexOf(t),o.next=9;break;case 6:return o.delegateYield(xe(t,e),"t0",7);case 7:n=o.t0,r=void 0!==n;case 9:return o.abrupt("return",r);case 10:case"end":return o.stop()}},D,this)}function Be(e,t,r){var n,o,a;return f.default.wrap(function(i){for(;;)switch(i.prev=i.next){case 0:if(void 0!==e){i.next=2;break}return i.abrupt("return",void 0);case 2:if(!(r<0)){i.next=4;break}throw{stack:(new Error).stack,value:r,code:"D3040",index:3};case 4:if(n=Z(),!(void 0===r||r>0)){i.next=17;break}return o=0,i.delegateYield(xe(t,e),"t0",8);case 8:if(void 0===(a=i.t0)){i.next=17;break}case 10:if(void 0===a||!(void 0===r||o<r)){i.next=17;break}return n.push({match:a.match,index:a.start,groups:a.groups}),i.delegateYield(xe(a.next),"t1",13);case 13:a=i.t1,o++,i.next=10;break;case 17:return i.abrupt("return",n);case 18:case"end":return i.stop()}},M,this)}function We(e,t,r,n){var o,a,i,s,u,c,l;return f.default.wrap(function(f){for(;;)switch(f.prev=f.next){case 0:if(void 0!==e){f.next=2;break}return f.abrupt("return",void 0);case 2:if(""!==t){f.next=4;break}throw{code:"D3010",stack:(new Error).stack,value:t,index:2};case 4:if(!(n<0)){f.next=6;break}throw{code:"D3011",stack:(new Error).stack,value:n,index:4};case 6:if(o="string"==typeof r?function(e){for(var t="",n=0,o=r.indexOf("$",n);-1!==o&&n<r.length;){t+=r.substring(n,o),n=o+1;var a=r.charAt(n);if("$"===a)t+="$",n++;else if("0"===a)t+=e.match,n++;else{var i;if(i=0===e.groups.length?1:Math.floor(Math.log(e.groups.length)*Math.LOG10E)+1,o=parseInt(r.substring(n,n+i),10),i>1&&o>e.groups.length&&(o=parseInt(r.substring(n,n+i-1),10)),isNaN(o))t+="$";else{if(e.groups.length>0){var s=e.groups[o-1];void 0!==s&&(t+=s)}n+=o.toString().length}}o=r.indexOf("$",n)}return t+=r.substring(n)}:r,a="",i=0,!(void 0===n||n>0)){f.next=41;break}if(s=0,"string"!=typeof t){f.next=17;break}for(u=e.indexOf(t,i);-1!==u&&(void 0===n||s<n);)a+=e.substring(i,u),a+=r,i=u+t.length,s++,u=e.indexOf(t,i);a+=e.substring(i),f.next=39;break;case 17:return f.delegateYield(xe(t,e),"t0",18);case 18:if(void 0===(c=f.t0)){f.next=38;break}case 20:if(void 0===c||!(void 0===n||s<n)){f.next=35;break}return a+=e.substring(i,c.start),f.delegateYield(Ye(o,[c],null),"t1",23);case 23:if("string"!=typeof(l=f.t1)){f.next=28;break}a+=l,f.next=29;break;case 28:throw{code:"D3012",stack:(new Error).stack,value:l};case 29:return i=c.start+c.match.length,s++,f.delegateYield(xe(c.next),"t2",32);case 32:c=f.t2,f.next=20;break;case 35:a+=e.substring(i),f.next=39;break;case 38:a=e;case 39:f.next=42;break;case 41:a=e;case 42:return f.abrupt("return",a);case 43:case"end":return f.stop()}},L,this)}function Ve(e,t,r){var n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:if(void 0!==e){s.next=2;break}return s.abrupt("return",void 0);case 2:if(!(r<0)){s.next=4;break}throw{code:"D3020",stack:(new Error).stack,value:r,index:3};case 4:if(n=[],!(void 0===r||r>0)){s.next=27;break}if("string"!=typeof t){s.next=10;break}n=e.split(t,r),s.next=27;break;case 10:return o=0,s.delegateYield(xe(t,e),"t0",12);case 12:if(void 0===(a=s.t0)){s.next=26;break}i=0;case 15:if(void 0===a||!(void 0===r||o<r)){s.next=23;break}return n.push(e.substring(i,a.start)),i=a.end,s.delegateYield(xe(a.next),"t1",19);case 19:a=s.t1,o++,s.next=15;break;case 23:(void 0===r||o<r)&&n.push(e.substring(i)),s.next=27;break;case 26:n.push(e);case 27:return s.abrupt("return",n);case 28:case"end":return s.stop()}},N,this)}function Ke(e,t){var r;if(void 0!==e){if(t){var n=e.toString().split("e");e=+(n[0]+"e"+(n[1]?+n[1]+t:t))}var a=(r=Math.round(e))-e;return.5===Math.abs(a)&&1===Math.abs(r%2)&&(r-=1),t&&(r=+((n=r.toString().split("e"))[0]+"e"+(n[1]?+n[1]-t:-t))),(0,o.default)(r,-0)&&(r=0),r}}function He(e){if(void 0!==e){var t=!1;if(Array.isArray(e)){if(1===e.length)t=He(e[0]);else if(e.length>1){t=e.filter(function(e){return He(e)}).length>0}}else"string"==typeof e?e.length>0&&(t=!0):V(e)?0!==e&&(t=!0):null!==e&&"object"===(void 0===e?"undefined":h(e))?(0,c.default)(e).length>0&&(Ae(e)||e._jsonata_function||(t=!0)):"boolean"==typeof e&&!0===e&&(t=!0);return t}}function Qe(e,t){var r,n,o,a,i;return f.default.wrap(function(s){for(;;)switch(s.prev=s.next){case 0:if(void 0!==e){s.next=2;break}return s.abrupt("return",void 0);case 2:r=Z(),n=0;case 4:if(!(n<e.length)){s.next=15;break}return o=[e[n]],(a="function"==typeof t?t.length:!0===t._jsonata_function?t.implementation.length:t.arguments.length)>=2&&o.push(n),a>=3&&o.push(e),s.delegateYield(Ye(t,o,null),"t0",10);case 10:void 0!==(i=s.t0)&&r.push(i);case 12:n++,s.next=4;break;case 15:return s.abrupt("return",r);case 16:case"end":return s.stop()}},F,this)}function Ze(e,t){var r,n,o;return f.default.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:if(void 0!==e){a.next=2;break}return a.abrupt("return",void 0);case 2:r=Z(),n=0;case 4:if(!(n<e.length)){a.next=12;break}return o=e[n],a.delegateYield(Ye(t,[o,n,e],null),"t0",7);case 7:He(a.t0)&&r.push(o);case 9:n++,a.next=4;break;case 12:return a.abrupt("return",r);case 13:case"end":return a.stop()}},I,this)}function Xe(e,t,r){var n,o;return f.default.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:if(void 0!==e){a.next=2;break}return a.abrupt("return",void 0);case 2:if(2===t.length||!0===t._jsonata_function&&2===t.implementation.length||2===t.arguments.length){a.next=4;break}throw{stack:(new Error).stack,code:"D3050",index:1};case 4:void 0===r&&e.length>0?(n=e[0],o=1):(n=r,o=0);case 5:if(!(o<e.length)){a.next=11;break}return a.delegateYield(Ye(t,[n,e[o]],null),"t0",7);case 7:n=a.t0,o++,a.next=5;break;case 11:return a.abrupt("return",n);case 12:case"end":return a.stop()}},R,this)}function et(e,t){return void 0===e?t:void 0===t?e:(Array.isArray(e)||(e=Z(e)),Array.isArray(t)||(t=[t]),e.concat(t))}function tt(e,t){var r,n,o;return f.default.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:r=Z(),a.t0=f.default.keys(e);case 2:if((a.t1=a.t0()).done){a.next=11;break}return n=a.t1.value,o=[e[n],n],a.t2=r,a.delegateYield(Ye(t,o,null),"t3",7);case 7:a.t4=a.t3,a.t2.push.call(a.t2,a.t4),a.next=2;break;case 11:return a.abrupt("return",r);case 12:case"end":return a.stop()}},C,this)}function rt(e,t){var r,n,o,a;return f.default.wrap(function(i){for(;;)switch(i.prev=i.next){case 0:if(void 0!==e){i.next=2;break}return i.abrupt("return",void 0);case 2:if(!(e.length<=1)){i.next=4;break}return i.abrupt("return",e);case 4:if(void 0!==t){i.next=10;break}if(H(e)||K(e)){i.next=7;break}throw{stack:(new Error).stack,code:"D3070",index:1};case 7:r=f.default.mark(function e(t,r){return f.default.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",t>r);case 1:case"end":return e.stop()}},e,this)}),i.next=11;break;case 10:r="function"==typeof t?t:f.default.mark(function e(r,n){return f.default.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.delegateYield(Ye(t,[r,n],null),"t0",1);case 1:return e.abrupt("return",e.t0);case 2:case"end":return e.stop()}},e,this)});case 11:return n=f.default.mark(function e(t,n){var o,a;return f.default.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return o=f.default.mark(function e(t,n,o){return f.default.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:if(0!==n.length){a.next=4;break}Array.prototype.push.apply(t,o),a.next=16;break;case 4:if(0!==o.length){a.next=8;break}Array.prototype.push.apply(t,n),a.next=16;break;case 8:return a.delegateYield(r(n[0],o[0]),"t0",9);case 9:if(!a.t0){a.next=14;break}return t.push(o[0]),a.delegateYield(e(t,n,o.slice(1)),"t1",12);case 12:a.next=16;break;case 14:return t.push(n[0]),a.delegateYield(e(t,n.slice(1),o),"t2",16);case 16:case"end":return a.stop()}},e,this)}),a=[],e.delegateYield(o(a,t,n),"t0",3);case 3:return e.abrupt("return",a);case 4:case"end":return e.stop()}},e,this)}),o=f.default.mark(function e(t){var r,o,a;return f.default.wrap(function(i){for(;;)switch(i.prev=i.next){case 0:if(Array.isArray(t)&&!(t.length<=1)){i.next=4;break}return i.abrupt("return",t);case 4:return r=Math.floor(t.length/2),o=t.slice(0,r),a=t.slice(r),i.delegateYield(e(o),"t0",8);case 8:return o=i.t0,i.delegateYield(e(a),"t1",10);case 10:return a=i.t1,i.delegateYield(n(o,a),"t2",12);case 12:return i.abrupt("return",i.t2);case 13:case"end":return i.stop()}},e,this)}),i.delegateYield(o(e),"t0",14);case 14:return a=i.t0,i.abrupt("return",a);case 16:case"end":return i.stop()}},G,this)}function nt(e,t){var r,n,o;return f.default.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:r={},a.t0=f.default.keys(e);case 2:if((a.t1=a.t0()).done){a.next=10;break}return n=a.t1.value,o=e[n],a.delegateYield(Ye(t,[o,n,e],null),"t2",6);case 6:He(a.t2)&&(r[n]=o),a.next=2;break;case 10:return 0===(0,c.default)(r).length&&(r=void 0),a.abrupt("return",r);case 12:case"end":return a.stop()}},$,this)}var ot=new RegExp("^\\d{4}(-[01]\\d)*(-[0-3]\\d)*(T[0-2]\\d:[0-5]\\d:[0-5]\\d)*(\\.\\d+)?([+-][0-2]\\d:?[0-5]\\d|Z)?$");function at(e){var t={};return{bind:function(e,r){t[e]=r},lookup:function(r){var n;return t.hasOwnProperty(r)?n=t[r]:e&&(n=e.lookup(r)),n}}}W.bind("sum",$e(function(e){if(void 0!==e){var t=0;return e.forEach(function(e){t+=e}),t}},"<a<n>:n>")),W.bind("count",$e(function(e){return void 0===e?0:e.length},"<a:n>")),W.bind("max",$e(function(e){if(void 0!==e&&0!==e.length)return Math.max.apply(Math,e)},"<a<n>:n>")),W.bind("min",$e(function(e){if(void 0!==e&&0!==e.length)return Math.min.apply(Math,e)},"<a<n>:n>")),W.bind("average",$e(function(e){if(void 0!==e&&0!==e.length){var t=0;return e.forEach(function(e){t+=e}),t/e.length}},"<a<n>:n>")),W.bind("string",$e(ze,"<x-:s>")),W.bind("substring",$e(qe,"<s-nn?:s>")),W.bind("substringBefore",$e(function(e,t){if(void 0!==e){var r=e.indexOf(t);return r>-1?e.substr(0,r):e}},"<s-s:s>")),W.bind("substringAfter",$e(function(e,t){if(void 0!==e){var r=e.indexOf(t);return r>-1?e.substr(r+t.length):e}},"<s-s:s>")),W.bind("lowercase",$e(function(e){if(void 0!==e)return e.toLowerCase()},"<s-:s>")),W.bind("uppercase",$e(function(e){if(void 0!==e)return e.toUpperCase()},"<s-:s>")),W.bind("length",$e(Ue,"<s-:n>")),W.bind("trim",$e(function(e){if(void 0!==e){var t=e.replace(/[ \t\n\r]+/gm," ");return" "===t.charAt(0)&&(t=t.substring(1))," "===t.charAt(t.length-1)&&(t=t.substring(0,t.length-1)),t}},"<s-:s>")),W.bind("pad",$e(function(e,t,r){if(void 0!==e){var n;void 0!==r&&0!==r.length||(r=" ");var o=Math.abs(t)-Ue(e);if(o>0){var a=new Array(o+1).join(r);r.length>1&&(a=qe(a,0,o)),n=t>0?e+a:a+e}else n=e;return n}},"<s-ns?:s>")),W.bind("match",$e(Be,"<s-f<s:o>n?:a<o>>")),W.bind("contains",$e(Je,"<s-(sf):b>")),W.bind("replace",$e(We,"<s-(sf)(sf)n?:s>")),W.bind("split",$e(Ve,"<s-(sf)n?:a<s>>")),W.bind("join",$e(function(e,t){if(void 0!==e)return void 0===t&&(t=""),e.join(t)},"<a<s>s?:s>")),W.bind("formatNumber",$e(function(e,t,r){if(void 0!==e){var n={"decimal-separator":".","grouping-separator":",","exponent-separator":"e",infinity:"Infinity","minus-sign":"-",NaN:"NaN",percent:"%","per-mille":"‰","zero-digit":"0",digit:"#","pattern-separator":";"};void 0!==r&&(0,c.default)(r).forEach(function(e){n[e]=r[e]});for(var o=[],a=n["zero-digit"].charCodeAt(0),s=a;s<a+10;s++)o.push(String.fromCharCode(s));var u=o.concat([n["decimal-separator"],n["exponent-separator"],n["grouping-separator"],n.digit,n["pattern-separator"]]),f=t.split(n["pattern-separator"]);if(f.length>2)throw{code:"D3080",stack:(new Error).stack};var l=f.map(function(e){var t,r,o,a,i=function(){for(var t,r=0;r<e.length;r++)if(t=e.charAt(r),-1!==u.indexOf(t)&&t!==n["exponent-separator"])return e.substring(0,r)}(),s=function(){for(var t,r=e.length-1;r>=0;r--)if(t=e.charAt(r),-1!==u.indexOf(t)&&t!==n["exponent-separator"])return e.substring(r+1)}(),c=e.substring(i.length,e.length-s.length),f=e.indexOf(n["exponent-separator"],i.length);-1===f||f>e.length-s.length?(t=c,r=void 0):(t=c.substring(0,f),r=c.substring(f+1));var l=t.indexOf(n["decimal-separator"]);return-1===l?(o=t,a=s):(o=t.substring(0,l),a=t.substring(l+1)),{prefix:i,suffix:s,activePart:c,mantissaPart:t,exponentPart:r,integerPart:o,fractionalPart:a,subpicture:e}});l.forEach(function(e){var t,r,a=e.subpicture,i=a.indexOf(n["decimal-separator"]);i!==a.lastIndexOf(n["decimal-separator"])&&(t="D3081"),a.indexOf(n.percent)!==a.lastIndexOf(n.percent)&&(t="D3082"),a.indexOf(n["per-mille"])!==a.lastIndexOf(n["per-mille"])&&(t="D3083"),-1!==a.indexOf(n.percent)&&-1!==a.indexOf(n["per-mille"])&&(t="D3084");var s=!1;for(r=0;r<e.mantissaPart.length;r++){var c=e.mantissaPart.charAt(r);if(-1!==o.indexOf(c)||c===n.digit){s=!0;break}}s||(t="D3085"),-1!==e.activePart.split("").map(function(e){return-1===u.indexOf(e)?"p":"a"}).join("").indexOf("p")&&(t="D3086"),-1!==i?a.charAt(i-1)!==n["grouping-separator"]&&a.charAt(i+1)!==n["grouping-separator"]||(t="D3087"):e.integerPart.charAt(e.integerPart.length-1)===n["grouping-separator"]&&(t="D3088"),-1!==a.indexOf(n["grouping-separator"]+n["grouping-separator"])&&(t="D3089");var f=e.integerPart.indexOf(n.digit);-1!==f&&e.integerPart.substring(0,f).split("").filter(function(e){return o.indexOf(e)>-1}).length>0&&(t="D3090"),-1!==(f=e.fractionalPart.lastIndexOf(n.digit))&&e.fractionalPart.substring(f).split("").filter(function(e){return o.indexOf(e)>-1}).length>0&&(t="D3091");var l="string"==typeof e.exponentPart;if(l&&e.exponentPart.length>0&&(-1!==a.indexOf(n.percent)||-1!==a.indexOf(n["per-mille"]))&&(t="D3092"),l&&(0===e.exponentPart.length||e.exponentPart.split("").filter(function(e){return-1===o.indexOf(e)}).length>0)&&(t="D3093"),t)throw{code:t,stack:(new Error).stack}});var p,d,h,b,v=l.map(function(e){var t=function(t,r){for(var a=[],i=t.indexOf(n["grouping-separator"]);-1!==i;){var s=(r?t.substring(0,i):t.substring(i)).split("").filter(function(e){return-1!==o.indexOf(e)||e===n.digit}).length;a.push(s),i=e.integerPart.indexOf(n["grouping-separator"],i+1)}return a},r=t(e.integerPart),a=function(e){if(0===e.length)return 0;for(var t=e.reduce(function e(t,r){return 0===r?t:e(r,t%r)}),r=1;r<=e.length;r++)if(-1===e.indexOf(r*t))return 0;return t}(r),i=t(e.fractionalPart,!0),s=e.integerPart.split("").filter(function(e){return-1!==o.indexOf(e)}).length,u=s,c=e.fractionalPart.split(""),f=c.filter(function(e){return-1!==o.indexOf(e)}).length,l=c.filter(function(e){return-1!==o.indexOf(e)||e===n.digit}).length,p="string"==typeof e.exponentPart;0===s&&0===l&&(p?(f=1,l=1):s=1),p&&0===s&&-1!==e.integerPart.indexOf(n.digit)&&(s=1),0===s&&0===f&&(f=1);var d=0;return p&&(d=e.exponentPart.split("").filter(function(e){return-1!==o.indexOf(e)}).length),{integerPartGroupingPositions:r,regularGrouping:a,minimumIntegerPartSize:s,scalingFactor:u,prefix:e.prefix,fractionalPartGroupingPositions:i,minimumFactionalPartSize:f,maximumFactionalPartSize:l,minimumExponentSize:d,suffix:e.suffix,picture:e.subpicture}}),g=n["minus-sign"],m=n["zero-digit"],y=n["decimal-separator"],_=n["grouping-separator"];if(1===v.length&&(v.push(JSON.parse((0,i.default)(v[0]))),v[1].prefix=g+v[1].prefix),d=-1!==(p=e>=0?v[0]:v[1]).picture.indexOf(n.percent)?100*e:-1!==p.picture.indexOf(n["per-mille"])?1e3*e:e,0===p.minimumExponentSize)h=d;else{var x=Math.pow(10,p.scalingFactor),k=Math.pow(10,p.scalingFactor-1);for(h=d,b=0;h<k;)h*=10,b-=1;for(;h>x;)h/=10,b+=1}var w=function(e,t){var r=Math.abs(e).toFixed(t);return"0"!==m&&(r=r.split("").map(function(e){return e>="0"&&e<="9"?o[e.charCodeAt(0)-48]:e}).join("")),r},j=w(Ke(h,p.maximumFactionalPartSize),p.maximumFactionalPartSize),S=j.indexOf(".");for(-1===S?j+=y:j=j.replace(".",y);j.charAt(0)===m;)j=j.substring(1);for(;j.charAt(j.length-1)===m;)j=j.substring(0,j.length-1);S=j.indexOf(y);var O=p.minimumIntegerPartSize-S,E=p.minimumFactionalPartSize-(j.length-S-1);if(j=(O>0?new Array(O+1).join(m):"")+j,j+=E>0?new Array(E+1).join(m):"",S=j.indexOf(y),p.regularGrouping>0)for(var A=Math.floor((S-1)/p.regularGrouping),T=1;T<=A;T++)j=[j.slice(0,S-T*p.regularGrouping),_,j.slice(S-T*p.regularGrouping)].join("");else p.integerPartGroupingPositions.forEach(function(e){j=[j.slice(0,S-e),_,j.slice(S-e)].join(""),S++});if(S=j.indexOf(y),p.fractionalPartGroupingPositions.forEach(function(e){j=[j.slice(0,e+S+1),_,j.slice(e+S+1)].join("")}),S=j.indexOf(y),-1!==p.picture.indexOf(y)&&S!==j.length-1||(j=j.substring(0,j.length-1)),void 0!==b){var P=w(b,0);(O=p.minimumExponentSize-P.length)>0&&(P=new Array(O+1).join(m)+P),j=j+n["exponent-separator"]+(b<0?g:"")+P}return j=p.prefix+j+p.suffix}},"<n-so?:s>")),W.bind("formatBase",$e(function(e,t){if(void 0!==e){if(e=Ke(e),(t=void 0===t?10:Ke(t))<2||t>36)throw{code:"D3100",stack:(new Error).stack,value:t};return e.toString(t)}},"<n-n?:s>")),W.bind("number",$e(function(e){var t;if(void 0!==e){if("number"==typeof e)t=e;else{if("string"!=typeof e||!/^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?$/.test(e)||isNaN(parseFloat(e))||!isFinite(e))throw{code:"D3030",value:e,stack:(new Error).stack,index:1};t=parseFloat(e)}return t}},"<(ns)-:n>")),W.bind("floor",$e(function(e){if(void 0!==e)return Math.floor(e)},"<n-:n>")),W.bind("ceil",$e(function(e){if(void 0!==e)return Math.ceil(e)},"<n-:n>")),W.bind("round",$e(Ke,"<n-n?:n>")),W.bind("abs",$e(function(e){if(void 0!==e)return Math.abs(e)},"<n-:n>")),W.bind("sqrt",$e(function(e){if(void 0!==e){if(e<0)throw{stack:(new Error).stack,code:"D3060",index:1,value:e};return Math.sqrt(e)}},"<n-:n>")),W.bind("power",$e(function(e,t){var r;if(void 0!==e){if(r=Math.pow(e,t),!isFinite(r))throw{stack:(new Error).stack,code:"D3061",index:1,value:e,exp:t};return r}},"<n-n:n>")),W.bind("random",$e(function(){return Math.random()},"<:n>")),W.bind("boolean",$e(He,"<x-:b>")),W.bind("not",$e(function(e){return!He(e)},"<x-:b>")),W.bind("map",$e(Qe,"<af>")),W.bind("zip",$e(function(){for(var e=[],t=Array.prototype.slice.call(arguments),r=Math.min.apply(Math,t.map(function(e){return Array.isArray(e)?e.length:0})),n=0;n<r;n++){var o=t.map(function(e){return e[n]});e.push(o)}return e},"<a+>")),W.bind("filter",$e(Ze,"<af>")),W.bind("reduce",$e(Xe,"<afj?:j>")),W.bind("sift",$e(nt,"<o-f?:o>")),W.bind("keys",$e(function e(t){var r=Z();if(Array.isArray(t)){var n={};t.forEach(function(t){var r=e(t);Array.isArray(r)&&r.forEach(function(e){n[e]=!0})}),r=e(n)}else null===t||"object"!==(void 0===t?"undefined":h(t))||Ae(t)?r=void 0:0===(r=(0,c.default)(t)).length&&(r=void 0);return r},"<x-:a<s>>")),W.bind("lookup",$e(function(e,t){return ie({value:t},e)},"<x-s:x>")),W.bind("append",$e(et,"<xx:a>")),W.bind("exists",$e(function(e){return void 0!==e},"<x:b>")),W.bind("spread",$e(function e(t){var r=Z();if(Array.isArray(t))t.forEach(function(t){r=et(r,e(t))});else if(null===t||"object"!==(void 0===t?"undefined":h(t))||Ae(t))r=t;else for(var n in t){var o={};o[n]=t[n],r.push(o)}return r},"<x-:a<o>>")),W.bind("merge",$e(function(e){if(void 0!==e){var t={};return e.forEach(function(e){for(var r in e)t[r]=e[r]}),t}},"<a<o>:o>")),W.bind("reverse",$e(function(e){if(void 0!==e){if(e.length<=1)return e;for(var t=e.length,r=new Array(t),n=0;n<t;n++)r[t-n-1]=e[n];return r}},"<a:a>")),W.bind("each",$e(tt,"<o-f:a>")),W.bind("sort",$e(rt,"<af?:a>")),W.bind("shuffle",$e(function(e){if(void 0!==e){if(e.length<=1)return e;for(var t=new Array(e.length),r=0;r<e.length;r++){var n=Math.floor(Math.random()*(r+1));r!==n&&(t[r]=t[n]),t[n]=e[r]}return t}},"<a:a>")),W.bind("base64encode",$e(function(e){if(void 0!==e)return("undefined"!=typeof window?window.btoa:function(e){return new r.Buffer(e,"binary").toString("base64")})(e)},"<s-:s>")),W.bind("base64decode",$e(function(e){if(void 0!==e)return("undefined"!=typeof window?window.atob:function(e){return new r.Buffer(e,"base64").toString("binary")})(e)},"<s-:s>")),W.bind("toMillis",$e(function(e){if(void 0!==e){if(!ot.test(e))throw{stack:(new Error).stack,code:"D3110",value:e};return Date.parse(e)}},"<s-:n>")),W.bind("fromMillis",$e(function(e){if(void 0!==e)return new Date(e).toISOString()},"<n-:s>")),W.bind("clone",$e(function(e){if(void 0!==e)return JSON.parse(ze(e))},"<(oa)-:o>"));var it={S0101:"String literal must be terminated by a matching quote",S0102:"Number out of range: {{token}}",S0103:"Unsupported escape sequence: \\{{token}}",S0104:"The escape sequence \\u must be followed by 4 hex digits",S0105:"Quoted property name must be terminated with a backquote (`)",S0201:"Syntax error: {{token}}",S0202:"Expected {{value}}, got {{token}}",S0203:"Expected {{value}} before end of expression",S0204:"Unknown operator: {{token}}",S0205:"Unexpected token: {{token}}",S0206:"Unknown expression type: {{token}}",S0207:"Unexpected end of expression",S0208:"Parameter {{value}} of function definition must be a variable name (start with $)",S0209:"A predicate cannot follow a grouping expression in a step",S0210:"Each step can only have one grouping expression",S0211:"The symbol {{token}} cannot be used as a unary operator",S0212:"The left side of := must be a variable name (start with $)",S0213:"The literal value {{value}} cannot be used as a step within a path expression",S0301:"Empty regular expressions are not allowed",S0302:"No terminating / in regular expression",S0402:"Choice groups containing parameterized types are not supported",S0401:"Type parameters can only be applied to functions and arrays",S0500:"Attempted to evaluate an expression containing syntax error(s)",T0410:"Argument {{index}} of function {{token}} does not match function signature",T0411:"Context value is not a compatible type with argument {{index}} of function {{token}}",T0412:"Argument {{index}} of function {{token}} must be an array of {{type}}",D1001:"Number out of range: {{value}}",D1002:"Cannot negate a non-numeric value: {{value}}",T1003:"Key in object structure must evaluate to a string; got: {{value}}",D1004:"Regular expression matches zero length string",T1005:"Attempted to invoke a non-function. Did you mean ${{{token}}}?",T1006:"Attempted to invoke a non-function",T1007:"Attempted to partially apply a non-function. Did you mean ${{{token}}}?",T1008:"Attempted to partially apply a non-function",D1009:"Multiple key definitions evaluate to same key: {{value}}",T1010:"The matcher function argument passed to function {{token}} does not return the correct object structure",T2001:"The left side of the {{token}} operator must evaluate to a number",T2002:"The right side of the {{token}} operator must evaluate to a number",T2003:"The left side of the range operator (..) must evaluate to an integer",T2004:"The right side of the range operator (..) must evaluate to an integer",D2005:"The left side of := must be a variable name (start with $)",T2006:"The right side of the function application operator ~> must be a function",T2007:"Type mismatch when comparing values {{value}} and {{value2}} in order-by clause",T2008:"The expressions within an order-by clause must evaluate to numeric or string values",T2009:"The values {{value}} and {{value2}} either side of operator {{token}} must be of the same data type",T2010:"The expressions either side of operator {{token}} must evaluate to numeric or string values",T2011:"The insert/update clause of the transform expression must evaluate to an object: {{value}}",T2012:"The delete clause of the transform expression must evaluate to a string or array of strings: {{value}}",T2013:"The transform expression clones the input object using the $clone() function.  This has been overridden in the current scope by a non-function.",D3001:"Attempting to invoke string function on Infinity or NaN",D3010:"Second argument of replace function cannot be an empty string",D3011:"Fourth argument of replace function must evaluate to a positive number",D3012:"Attempted to replace a matched string with a non-string value",D3020:"Third argument of split function must evaluate to a positive number",D3030:"Unable to cast value to a number: {{value}}",D3040:"Third argument of match function must evaluate to a positive number",D3050:"First argument of reduce function must be a function with two arguments",D3060:"The sqrt function cannot be applied to a negative number: {{value}}",D3061:"The power function has resulted in a value that cannot be represented as a JSON number: base={{value}}, exponent={{exp}}",D3070:"The single argument form of the sort function can only be applied to an array of strings or an array of numbers.  Use the second argument to specify a comparison function",D3080:"The picture string must only contain a maximum of two sub-pictures",D3081:"The sub-picture must not contain more than one instance of the 'decimal-separator' character",D3082:"The sub-picture must not contain more than one instance of the 'percent' character",D3083:"The sub-picture must not contain more than one instance of the 'per-mille' character",D3084:"The sub-picture must not contain both a 'percent' and a 'per-mille' character",D3085:"The mantissa part of a sub-picture must contain at least one character that is either an 'optional digit character' or a member of the 'decimal digit family'",D3086:"The sub-picture must not contain a passive character that is preceded by an active character and that is followed by another active character",D3087:"The sub-picture must not contain a 'grouping-separator' character that appears adjacent to a 'decimal-separator' character",D3088:"The sub-picture must not contain a 'grouping-separator' at the end of the integer part",D3089:"The sub-picture must not contain two adjacent instances of the 'grouping-separator' character",D3090:"The integer part of the sub-picture must not contain a member of the 'decimal digit family' that is followed by an instance of the 'optional digit character'",D3091:"The fractional part of the sub-picture must not contain an instance of the 'optional digit character' that is followed by a member of the 'decimal digit family'",D3092:"A sub-picture that contains a 'percent' or 'per-mille' character must not contain a character treated as an 'exponent-separator'",D3093:"The exponent part of the sub-picture must comprise only of one or more characters that are members of the 'decimal digit family'",D3100:"The radix of the formatBase function must be between 2 and 36.  It was given {{value}}",D3110:"The argument of the toMillis function must be an ISO 8601 formatted timestamp. Given {{value}}"};function st(e){var t="Unknown error";void 0!==e.message&&(t=e.message);var r=it[e.code];return void 0!==r&&(t=(t=r.replace(/\{\{\{([^}]+)}}}/g,function(){return e[arguments[1]]})).replace(/\{\{([^}]+)}}/g,function(){return(0,i.default)(e[arguments[1]])})),t}function ut(e,t){var r,n;try{r=B(e,t&&t.recover),n=r.errors,delete r.errors}catch(e){throw e.message=st(e),e}var o=at(W),a=new Date;return o.bind("now",$e(function(){return a.toJSON()},"<:s>")),o.bind("millis",$e(function(){return a.getTime()},"<:n>")),{evaluate:function(e,t,i){if(void 0!==n){var s={code:"S0500",position:0};throw s.message=st(s),s}var u,c,f;if(void 0!==t)for(var l in u=at(o),t)u.bind(l,t[l]);else u=o;if(u.bind("$",e),a=new Date,"function"==typeof i){u.bind("__jsonata_async",!0);var p=function(e){e.message=st(e),i(e,null)};f=Q(r,e,u),(c=f.next()).value.then(function e(t){(c=f.next(t)).done?i(null,c.value):c.value.then(e).catch(p)}).catch(p)}else try{for(f=Q(r,e,u),c=f.next();!c.done;)c=f.next(c.value);return c.value}catch(s){throw s.message=st(s),s}},assign:function(e,t){o.bind(e,t)},registerFunction:function(e,t,r){var n=$e(t,r);o.bind(e,n)},ast:function(){return r},errors:function(){return n}}}return ut.parser=B,ut}();void 0!==t&&(t.exports=v)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"babel-runtime/core-js/array/from":2,"babel-runtime/core-js/is-iterable":3,"babel-runtime/core-js/json/stringify":4,"babel-runtime/core-js/number/is-integer":5,"babel-runtime/core-js/object/create":6,"babel-runtime/core-js/object/is":7,"babel-runtime/core-js/object/keys":8,"babel-runtime/core-js/promise":9,"babel-runtime/core-js/symbol":10,"babel-runtime/core-js/symbol/iterator":11,"babel-runtime/regenerator":12}],2:[function(e,t,r){t.exports={default:e("core-js/library/fn/array/from"),__esModule:!0}},{"core-js/library/fn/array/from":13}],3:[function(e,t,r){t.exports={default:e("core-js/library/fn/is-iterable"),__esModule:!0}},{"core-js/library/fn/is-iterable":14}],4:[function(e,t,r){t.exports={default:e("core-js/library/fn/json/stringify"),__esModule:!0}},{"core-js/library/fn/json/stringify":15}],5:[function(e,t,r){t.exports={default:e("core-js/library/fn/number/is-integer"),__esModule:!0}},{"core-js/library/fn/number/is-integer":16}],6:[function(e,t,r){t.exports={default:e("core-js/library/fn/object/create"),__esModule:!0}},{"core-js/library/fn/object/create":17}],7:[function(e,t,r){t.exports={default:e("core-js/library/fn/object/is"),__esModule:!0}},{"core-js/library/fn/object/is":18}],8:[function(e,t,r){t.exports={default:e("core-js/library/fn/object/keys"),__esModule:!0}},{"core-js/library/fn/object/keys":19}],9:[function(e,t,r){t.exports={default:e("core-js/library/fn/promise"),__esModule:!0}},{"core-js/library/fn/promise":20}],10:[function(e,t,r){t.exports={default:e("core-js/library/fn/symbol"),__esModule:!0}},{"core-js/library/fn/symbol":21}],11:[function(e,t,r){t.exports={default:e("core-js/library/fn/symbol/iterator"),__esModule:!0}},{"core-js/library/fn/symbol/iterator":22}],12:[function(e,t,r){t.exports=e("regenerator-runtime")},{"regenerator-runtime":115}],13:[function(e,t,r){e("../../modules/es6.string.iterator"),e("../../modules/es6.array.from"),t.exports=e("../../modules/_core").Array.from},{"../../modules/_core":30,"../../modules/es6.array.from":100,"../../modules/es6.string.iterator":108}],14:[function(e,t,r){e("../modules/web.dom.iterable"),e("../modules/es6.string.iterator"),t.exports=e("../modules/core.is-iterable")},{"../modules/core.is-iterable":99,"../modules/es6.string.iterator":108,"../modules/web.dom.iterable":114}],15:[function(e,t,r){var n=e("../../modules/_core"),o=n.JSON||(n.JSON={stringify:JSON.stringify});t.exports=function(e){return o.stringify.apply(o,arguments)}},{"../../modules/_core":30}],16:[function(e,t,r){e("../../modules/es6.number.is-integer"),t.exports=e("../../modules/_core").Number.isInteger},{"../../modules/_core":30,"../../modules/es6.number.is-integer":102}],17:[function(e,t,r){e("../../modules/es6.object.create");var n=e("../../modules/_core").Object;t.exports=function(e,t){return n.create(e,t)}},{"../../modules/_core":30,"../../modules/es6.object.create":103}],18:[function(e,t,r){e("../../modules/es6.object.is"),t.exports=e("../../modules/_core").Object.is},{"../../modules/_core":30,"../../modules/es6.object.is":104}],19:[function(e,t,r){e("../../modules/es6.object.keys"),t.exports=e("../../modules/_core").Object.keys},{"../../modules/_core":30,"../../modules/es6.object.keys":105}],20:[function(e,t,r){e("../modules/es6.object.to-string"),e("../modules/es6.string.iterator"),e("../modules/web.dom.iterable"),e("../modules/es6.promise"),e("../modules/es7.promise.finally"),e("../modules/es7.promise.try"),t.exports=e("../modules/_core").Promise},{"../modules/_core":30,"../modules/es6.object.to-string":106,"../modules/es6.promise":107,"../modules/es6.string.iterator":108,"../modules/es7.promise.finally":110,"../modules/es7.promise.try":111,"../modules/web.dom.iterable":114}],21:[function(e,t,r){e("../../modules/es6.symbol"),e("../../modules/es6.object.to-string"),e("../../modules/es7.symbol.async-iterator"),e("../../modules/es7.symbol.observable"),t.exports=e("../../modules/_core").Symbol},{"../../modules/_core":30,"../../modules/es6.object.to-string":106,"../../modules/es6.symbol":109,"../../modules/es7.symbol.async-iterator":112,"../../modules/es7.symbol.observable":113}],22:[function(e,t,r){e("../../modules/es6.string.iterator"),e("../../modules/web.dom.iterable"),t.exports=e("../../modules/_wks-ext").f("iterator")},{"../../modules/_wks-ext":96,"../../modules/es6.string.iterator":108,"../../modules/web.dom.iterable":114}],23:[function(e,t,r){t.exports=function(e){if("function"!=typeof e)throw TypeError(e+" is not a function!");return e}},{}],24:[function(e,t,r){t.exports=function(){}},{}],25:[function(e,t,r){t.exports=function(e,t,r,n){if(!(e instanceof t)||void 0!==n&&n in e)throw TypeError(r+": incorrect invocation!");return e}},{}],26:[function(e,t,r){var n=e("./_is-object");t.exports=function(e){if(!n(e))throw TypeError(e+" is not an object!");return e}},{"./_is-object":51}],27:[function(e,t,r){var n=e("./_to-iobject"),o=e("./_to-length"),a=e("./_to-absolute-index");t.exports=function(e){return function(t,r,i){var s,u=n(t),c=o(u.length),f=a(i,c);if(e&&r!=r){for(;c>f;)if((s=u[f++])!=s)return!0}else for(;c>f;f++)if((e||f in u)&&u[f]===r)return e||f||0;return!e&&-1}}},{"./_to-absolute-index":87,"./_to-iobject":89,"./_to-length":90}],28:[function(e,t,r){var n=e("./_cof"),o=e("./_wks")("toStringTag"),a="Arguments"==n(function(){return arguments}());t.exports=function(e){var t,r,i;return void 0===e?"Undefined":null===e?"Null":"string"==typeof(r=function(e,t){try{return e[t]}catch(e){}}(t=Object(e),o))?r:a?n(t):"Object"==(i=n(t))&&"function"==typeof t.callee?"Arguments":i}},{"./_cof":29,"./_wks":97}],29:[function(e,t,r){var n={}.toString;t.exports=function(e){return n.call(e).slice(8,-1)}},{}],30:[function(e,t,r){var n=t.exports={version:"2.5.6"};"number"==typeof __e&&(__e=n)},{}],31:[function(e,t,r){"use strict";var n=e("./_object-dp"),o=e("./_property-desc");t.exports=function(e,t,r){t in e?n.f(e,t,o(0,r)):e[t]=r}},{"./_object-dp":63,"./_property-desc":76}],32:[function(e,t,r){var n=e("./_a-function");t.exports=function(e,t,r){if(n(e),void 0===t)return e;switch(r){case 1:return function(r){return e.call(t,r)};case 2:return function(r,n){return e.call(t,r,n)};case 3:return function(r,n,o){return e.call(t,r,n,o)}}return function(){return e.apply(t,arguments)}}},{"./_a-function":23}],33:[function(e,t,r){t.exports=function(e){if(void 0==e)throw TypeError("Can't call method on  "+e);return e}},{}],34:[function(e,t,r){t.exports=!e("./_fails")(function(){return 7!=Object.defineProperty({},"a",{get:function(){return 7}}).a})},{"./_fails":39}],35:[function(e,t,r){var n=e("./_is-object"),o=e("./_global").document,a=n(o)&&n(o.createElement);t.exports=function(e){return a?o.createElement(e):{}}},{"./_global":41,"./_is-object":51}],36:[function(e,t,r){t.exports="constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",")},{}],37:[function(e,t,r){var n=e("./_object-keys"),o=e("./_object-gops"),a=e("./_object-pie");t.exports=function(e){var t=n(e),r=o.f;if(r)for(var i,s=r(e),u=a.f,c=0;s.length>c;)u.call(e,i=s[c++])&&t.push(i);return t}},{"./_object-gops":68,"./_object-keys":71,"./_object-pie":72}],38:[function(e,t,r){var n=e("./_global"),o=e("./_core"),a=e("./_ctx"),i=e("./_hide"),s=e("./_has"),u=function(e,t,r){var c,f,l,p=e&u.F,d=e&u.G,h=e&u.S,b=e&u.P,v=e&u.B,g=e&u.W,m=d?o:o[t]||(o[t]={}),y=m.prototype,_=d?n:h?n[t]:(n[t]||{}).prototype;for(c in d&&(r=t),r)(f=!p&&_&&void 0!==_[c])&&s(m,c)||(l=f?_[c]:r[c],m[c]=d&&"function"!=typeof _[c]?r[c]:v&&f?a(l,n):g&&_[c]==l?function(e){var t=function(t,r,n){if(this instanceof e){switch(arguments.length){case 0:return new e;case 1:return new e(t);case 2:return new e(t,r)}return new e(t,r,n)}return e.apply(this,arguments)};return t.prototype=e.prototype,t}(l):b&&"function"==typeof l?a(Function.call,l):l,b&&((m.virtual||(m.virtual={}))[c]=l,e&u.R&&y&&!y[c]&&i(y,c,l)))};u.F=1,u.G=2,u.S=4,u.P=8,u.B=16,u.W=32,u.U=64,u.R=128,t.exports=u},{"./_core":30,"./_ctx":32,"./_global":41,"./_has":42,"./_hide":43}],39:[function(e,t,r){t.exports=function(e){try{return!!e()}catch(e){return!0}}},{}],40:[function(e,t,r){var n=e("./_ctx"),o=e("./_iter-call"),a=e("./_is-array-iter"),i=e("./_an-object"),s=e("./_to-length"),u=e("./core.get-iterator-method"),c={},f={};(r=t.exports=function(e,t,r,l,p){var d,h,b,v,g=p?function(){return e}:u(e),m=n(r,l,t?2:1),y=0;if("function"!=typeof g)throw TypeError(e+" is not iterable!");if(a(g)){for(d=s(e.length);d>y;y++)if((v=t?m(i(h=e[y])[0],h[1]):m(e[y]))===c||v===f)return v}else for(b=g.call(e);!(h=b.next()).done;)if((v=o(b,m,h.value,t))===c||v===f)return v}).BREAK=c,r.RETURN=f},{"./_an-object":26,"./_ctx":32,"./_is-array-iter":48,"./_iter-call":52,"./_to-length":90,"./core.get-iterator-method":98}],41:[function(e,t,r){var n=t.exports="undefined"!=typeof window&&window.Math==Math?window:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();"number"==typeof __g&&(__g=n)},{}],42:[function(e,t,r){var n={}.hasOwnProperty;t.exports=function(e,t){return n.call(e,t)}},{}],43:[function(e,t,r){var n=e("./_object-dp"),o=e("./_property-desc");t.exports=e("./_descriptors")?function(e,t,r){return n.f(e,t,o(1,r))}:function(e,t,r){return e[t]=r,e}},{"./_descriptors":34,"./_object-dp":63,"./_property-desc":76}],44:[function(e,t,r){var n=e("./_global").document;t.exports=n&&n.documentElement},{"./_global":41}],45:[function(e,t,r){t.exports=!e("./_descriptors")&&!e("./_fails")(function(){return 7!=Object.defineProperty(e("./_dom-create")("div"),"a",{get:function(){return 7}}).a})},{"./_descriptors":34,"./_dom-create":35,"./_fails":39}],46:[function(e,t,r){t.exports=function(e,t,r){var n=void 0===r;switch(t.length){case 0:return n?e():e.call(r);case 1:return n?e(t[0]):e.call(r,t[0]);case 2:return n?e(t[0],t[1]):e.call(r,t[0],t[1]);case 3:return n?e(t[0],t[1],t[2]):e.call(r,t[0],t[1],t[2]);case 4:return n?e(t[0],t[1],t[2],t[3]):e.call(r,t[0],t[1],t[2],t[3])}return e.apply(r,t)}},{}],47:[function(e,t,r){var n=e("./_cof");t.exports=Object("z").propertyIsEnumerable(0)?Object:function(e){return"String"==n(e)?e.split(""):Object(e)}},{"./_cof":29}],48:[function(e,t,r){var n=e("./_iterators"),o=e("./_wks")("iterator"),a=Array.prototype;t.exports=function(e){return void 0!==e&&(n.Array===e||a[o]===e)}},{"./_iterators":57,"./_wks":97}],49:[function(e,t,r){var n=e("./_cof");t.exports=Array.isArray||function(e){return"Array"==n(e)}},{"./_cof":29}],50:[function(e,t,r){var n=e("./_is-object"),o=Math.floor;t.exports=function(e){return!n(e)&&isFinite(e)&&o(e)===e}},{"./_is-object":51}],51:[function(e,t,r){t.exports=function(e){return"object"==typeof e?null!==e:"function"==typeof e}},{}],52:[function(e,t,r){var n=e("./_an-object");t.exports=function(e,t,r,o){try{return o?t(n(r)[0],r[1]):t(r)}catch(t){var a=e.return;throw void 0!==a&&n(a.call(e)),t}}},{"./_an-object":26}],53:[function(e,t,r){"use strict";var n=e("./_object-create"),o=e("./_property-desc"),a=e("./_set-to-string-tag"),i={};e("./_hide")(i,e("./_wks")("iterator"),function(){return this}),t.exports=function(e,t,r){e.prototype=n(i,{next:o(1,r)}),a(e,t+" Iterator")}},{"./_hide":43,"./_object-create":62,"./_property-desc":76,"./_set-to-string-tag":81,"./_wks":97}],54:[function(e,t,r){"use strict";var n=e("./_library"),o=e("./_export"),a=e("./_redefine"),i=e("./_hide"),s=e("./_iterators"),u=e("./_iter-create"),c=e("./_set-to-string-tag"),f=e("./_object-gpo"),l=e("./_wks")("iterator"),p=!([].keys&&"next"in[].keys()),d=function(){return this};t.exports=function(e,t,r,h,b,v,g){u(r,t,h);var m,y,_,x=function(e){if(!p&&e in S)return S[e];switch(e){case"keys":case"values":return function(){return new r(this,e)}}return function(){return new r(this,e)}},k=t+" Iterator",w="values"==b,j=!1,S=e.prototype,O=S[l]||S["@@iterator"]||b&&S[b],E=O||x(b),A=b?w?x("entries"):E:void 0,T="Array"==t&&S.entries||O;if(T&&(_=f(T.call(new e)))!==Object.prototype&&_.next&&(c(_,k,!0),n||"function"==typeof _[l]||i(_,l,d)),w&&O&&"values"!==O.name&&(j=!0,E=function(){return O.call(this)}),n&&!g||!p&&!j&&S[l]||i(S,l,E),s[t]=E,s[k]=d,b)if(m={values:w?E:x("values"),keys:v?E:x("keys"),entries:A},g)for(y in m)y in S||a(S,y,m[y]);else o(o.P+o.F*(p||j),t,m);return m}},{"./_export":38,"./_hide":43,"./_iter-create":53,"./_iterators":57,"./_library":58,"./_object-gpo":69,"./_redefine":78,"./_set-to-string-tag":81,"./_wks":97}],55:[function(e,t,r){var n=e("./_wks")("iterator"),o=!1;try{var a=[7][n]();a.return=function(){o=!0},Array.from(a,function(){throw 2})}catch(e){}t.exports=function(e,t){if(!t&&!o)return!1;var r=!1;try{var a=[7],i=a[n]();i.next=function(){return{done:r=!0}},a[n]=function(){return i},e(a)}catch(e){}return r}},{"./_wks":97}],56:[function(e,t,r){t.exports=function(e,t){return{value:t,done:!!e}}},{}],57:[function(e,t,r){t.exports={}},{}],58:[function(e,t,r){t.exports=!0},{}],59:[function(e,t,r){var n=e("./_uid")("meta"),o=e("./_is-object"),a=e("./_has"),i=e("./_object-dp").f,s=0,u=Object.isExtensible||function(){return!0},c=!e("./_fails")(function(){return u(Object.preventExtensions({}))}),f=function(e){i(e,n,{value:{i:"O"+ ++s,w:{}}})},l=t.exports={KEY:n,NEED:!1,fastKey:function(e,t){if(!o(e))return"symbol"==typeof e?e:("string"==typeof e?"S":"P")+e;if(!a(e,n)){if(!u(e))return"F";if(!t)return"E";f(e)}return e[n].i},getWeak:function(e,t){if(!a(e,n)){if(!u(e))return!0;if(!t)return!1;f(e)}return e[n].w},onFreeze:function(e){return c&&l.NEED&&u(e)&&!a(e,n)&&f(e),e}}},{"./_fails":39,"./_has":42,"./_is-object":51,"./_object-dp":63,"./_uid":93}],60:[function(e,t,r){var n=e("./_global"),o=e("./_task").set,a=n.MutationObserver||n.WebKitMutationObserver,i=n.process,s=n.Promise,u="process"==e("./_cof")(i);t.exports=function(){var e,t,r,c=function(){var n,o;for(u&&(n=i.domain)&&n.exit();e;){o=e.fn,e=e.next;try{o()}catch(n){throw e?r():t=void 0,n}}t=void 0,n&&n.enter()};if(u)r=function(){i.nextTick(c)};else if(!a||n.navigator&&n.navigator.standalone)if(s&&s.resolve){var f=s.resolve(void 0);r=function(){f.then(c)}}else r=function(){o.call(n,c)};else{var l=!0,p=document.createTextNode("");new a(c).observe(p,{characterData:!0}),r=function(){p.data=l=!l}}return function(n){var o={fn:n,next:void 0};t&&(t.next=o),e||(e=o,r()),t=o}}},{"./_cof":29,"./_global":41,"./_task":86}],61:[function(e,t,r){"use strict";var n=e("./_a-function");t.exports.f=function(e){return new function(e){var t,r;this.promise=new e(function(e,n){if(void 0!==t||void 0!==r)throw TypeError("Bad Promise constructor");t=e,r=n}),this.resolve=n(t),this.reject=n(r)}(e)}},{"./_a-function":23}],62:[function(e,t,r){var n=e("./_an-object"),o=e("./_object-dps"),a=e("./_enum-bug-keys"),i=e("./_shared-key")("IE_PROTO"),s=function(){},u=function(){var t,r=e("./_dom-create")("iframe"),n=a.length;for(r.style.display="none",e("./_html").appendChild(r),r.src="javascript:",(t=r.contentWindow.document).open(),t.write("<script>document.F=Object<\/script>"),t.close(),u=t.F;n--;)delete u.prototype[a[n]];return u()};t.exports=Object.create||function(e,t){var r;return null!==e?(s.prototype=n(e),r=new s,s.prototype=null,r[i]=e):r=u(),void 0===t?r:o(r,t)}},{"./_an-object":26,"./_dom-create":35,"./_enum-bug-keys":36,"./_html":44,"./_object-dps":64,"./_shared-key":82}],63:[function(e,t,r){var n=e("./_an-object"),o=e("./_ie8-dom-define"),a=e("./_to-primitive"),i=Object.defineProperty;r.f=e("./_descriptors")?Object.defineProperty:function(e,t,r){if(n(e),t=a(t,!0),n(r),o)try{return i(e,t,r)}catch(e){}if("get"in r||"set"in r)throw TypeError("Accessors not supported!");return"value"in r&&(e[t]=r.value),e}},{"./_an-object":26,"./_descriptors":34,"./_ie8-dom-define":45,"./_to-primitive":92}],64:[function(e,t,r){var n=e("./_object-dp"),o=e("./_an-object"),a=e("./_object-keys");t.exports=e("./_descriptors")?Object.defineProperties:function(e,t){o(e);for(var r,i=a(t),s=i.length,u=0;s>u;)n.f(e,r=i[u++],t[r]);return e}},{"./_an-object":26,"./_descriptors":34,"./_object-dp":63,"./_object-keys":71}],65:[function(e,t,r){var n=e("./_object-pie"),o=e("./_property-desc"),a=e("./_to-iobject"),i=e("./_to-primitive"),s=e("./_has"),u=e("./_ie8-dom-define"),c=Object.getOwnPropertyDescriptor;r.f=e("./_descriptors")?c:function(e,t){if(e=a(e),t=i(t,!0),u)try{return c(e,t)}catch(e){}if(s(e,t))return o(!n.f.call(e,t),e[t])}},{"./_descriptors":34,"./_has":42,"./_ie8-dom-define":45,"./_object-pie":72,"./_property-desc":76,"./_to-iobject":89,"./_to-primitive":92}],66:[function(e,t,r){var n=e("./_to-iobject"),o=e("./_object-gopn").f,a={}.toString,i="object"==typeof window&&window&&Object.getOwnPropertyNames?Object.getOwnPropertyNames(window):[];t.exports.f=function(e){return i&&"[object Window]"==a.call(e)?function(e){try{return o(e)}catch(e){return i.slice()}}(e):o(n(e))}},{"./_object-gopn":67,"./_to-iobject":89}],67:[function(e,t,r){var n=e("./_object-keys-internal"),o=e("./_enum-bug-keys").concat("length","prototype");r.f=Object.getOwnPropertyNames||function(e){return n(e,o)}},{"./_enum-bug-keys":36,"./_object-keys-internal":70}],68:[function(e,t,r){r.f=Object.getOwnPropertySymbols},{}],69:[function(e,t,r){var n=e("./_has"),o=e("./_to-object"),a=e("./_shared-key")("IE_PROTO"),i=Object.prototype;t.exports=Object.getPrototypeOf||function(e){return e=o(e),n(e,a)?e[a]:"function"==typeof e.constructor&&e instanceof e.constructor?e.constructor.prototype:e instanceof Object?i:null}},{"./_has":42,"./_shared-key":82,"./_to-object":91}],70:[function(e,t,r){var n=e("./_has"),o=e("./_to-iobject"),a=e("./_array-includes")(!1),i=e("./_shared-key")("IE_PROTO");t.exports=function(e,t){var r,s=o(e),u=0,c=[];for(r in s)r!=i&&n(s,r)&&c.push(r);for(;t.length>u;)n(s,r=t[u++])&&(~a(c,r)||c.push(r));return c}},{"./_array-includes":27,"./_has":42,"./_shared-key":82,"./_to-iobject":89}],71:[function(e,t,r){var n=e("./_object-keys-internal"),o=e("./_enum-bug-keys");t.exports=Object.keys||function(e){return n(e,o)}},{"./_enum-bug-keys":36,"./_object-keys-internal":70}],72:[function(e,t,r){r.f={}.propertyIsEnumerable},{}],73:[function(e,t,r){var n=e("./_export"),o=e("./_core"),a=e("./_fails");t.exports=function(e,t){var r=(o.Object||{})[e]||Object[e],i={};i[e]=t(r),n(n.S+n.F*a(function(){r(1)}),"Object",i)}},{"./_core":30,"./_export":38,"./_fails":39}],74:[function(e,t,r){t.exports=function(e){try{return{e:!1,v:e()}}catch(e){return{e:!0,v:e}}}},{}],75:[function(e,t,r){var n=e("./_an-object"),o=e("./_is-object"),a=e("./_new-promise-capability");t.exports=function(e,t){if(n(e),o(t)&&t.constructor===e)return t;var r=a.f(e);return(0,r.resolve)(t),r.promise}},{"./_an-object":26,"./_is-object":51,"./_new-promise-capability":61}],76:[function(e,t,r){t.exports=function(e,t){return{enumerable:!(1&e),configurable:!(2&e),writable:!(4&e),value:t}}},{}],77:[function(e,t,r){var n=e("./_hide");t.exports=function(e,t,r){for(var o in t)r&&e[o]?e[o]=t[o]:n(e,o,t[o]);return e}},{"./_hide":43}],78:[function(e,t,r){t.exports=e("./_hide")},{"./_hide":43}],79:[function(e,t,r){t.exports=Object.is||function(e,t){return e===t?0!==e||1/e==1/t:e!=e&&t!=t}},{}],80:[function(e,t,r){"use strict";var n=e("./_global"),o=e("./_core"),a=e("./_object-dp"),i=e("./_descriptors"),s=e("./_wks")("species");t.exports=function(e){var t="function"==typeof o[e]?o[e]:n[e];i&&t&&!t[s]&&a.f(t,s,{configurable:!0,get:function(){return this}})}},{"./_core":30,"./_descriptors":34,"./_global":41,"./_object-dp":63,"./_wks":97}],81:[function(e,t,r){var n=e("./_object-dp").f,o=e("./_has"),a=e("./_wks")("toStringTag");t.exports=function(e,t,r){e&&!o(e=r?e:e.prototype,a)&&n(e,a,{configurable:!0,value:t})}},{"./_has":42,"./_object-dp":63,"./_wks":97}],82:[function(e,t,r){var n=e("./_shared")("keys"),o=e("./_uid");t.exports=function(e){return n[e]||(n[e]=o(e))}},{"./_shared":83,"./_uid":93}],83:[function(e,t,r){var n=e("./_core"),o=e("./_global"),a=o["__core-js_shared__"]||(o["__core-js_shared__"]={});(t.exports=function(e,t){return a[e]||(a[e]=void 0!==t?t:{})})("versions",[]).push({version:n.version,mode:e("./_library")?"pure":"global",copyright:"© 2018 Denis Pushkarev (zloirock.ru)"})},{"./_core":30,"./_global":41,"./_library":58}],84:[function(e,t,r){var n=e("./_an-object"),o=e("./_a-function"),a=e("./_wks")("species");t.exports=function(e,t){var r,i=n(e).constructor;return void 0===i||void 0==(r=n(i)[a])?t:o(r)}},{"./_a-function":23,"./_an-object":26,"./_wks":97}],85:[function(e,t,r){var n=e("./_to-integer"),o=e("./_defined");t.exports=function(e){return function(t,r){var a,i,s=String(o(t)),u=n(r),c=s.length;return u<0||u>=c?e?"":void 0:(a=s.charCodeAt(u))<55296||a>56319||u+1===c||(i=s.charCodeAt(u+1))<56320||i>57343?e?s.charAt(u):a:e?s.slice(u,u+2):i-56320+(a-55296<<10)+65536}}},{"./_defined":33,"./_to-integer":88}],86:[function(e,t,r){var n,o,a,i=e("./_ctx"),s=e("./_invoke"),u=e("./_html"),c=e("./_dom-create"),f=e("./_global"),l=f.process,p=f.setImmediate,d=f.clearImmediate,h=f.MessageChannel,b=f.Dispatch,v=0,g={},m=function(){var e=+this;if(g.hasOwnProperty(e)){var t=g[e];delete g[e],t()}},y=function(e){m.call(e.data)};p&&d||(p=function(e){for(var t=[],r=1;arguments.length>r;)t.push(arguments[r++]);return g[++v]=function(){s("function"==typeof e?e:Function(e),t)},n(v),v},d=function(e){delete g[e]},"process"==e("./_cof")(l)?n=function(e){l.nextTick(i(m,e,1))}:b&&b.now?n=function(e){b.now(i(m,e,1))}:h?(a=(o=new h).port2,o.port1.onmessage=y,n=i(a.postMessage,a,1)):f.addEventListener&&"function"==typeof postMessage&&!f.importScripts?(n=function(e){f.postMessage(e+"","*")},f.addEventListener("message",y,!1)):n="onreadystatechange"in c("script")?function(e){u.appendChild(c("script")).onreadystatechange=function(){u.removeChild(this),m.call(e)}}:function(e){setTimeout(i(m,e,1),0)}),t.exports={set:p,clear:d}},{"./_cof":29,"./_ctx":32,"./_dom-create":35,"./_global":41,"./_html":44,"./_invoke":46}],87:[function(e,t,r){var n=e("./_to-integer"),o=Math.max,a=Math.min;t.exports=function(e,t){return(e=n(e))<0?o(e+t,0):a(e,t)}},{"./_to-integer":88}],88:[function(e,t,r){var n=Math.ceil,o=Math.floor;t.exports=function(e){return isNaN(e=+e)?0:(e>0?o:n)(e)}},{}],89:[function(e,t,r){var n=e("./_iobject"),o=e("./_defined");t.exports=function(e){return n(o(e))}},{"./_defined":33,"./_iobject":47}],90:[function(e,t,r){var n=e("./_to-integer"),o=Math.min;t.exports=function(e){return e>0?o(n(e),9007199254740991):0}},{"./_to-integer":88}],91:[function(e,t,r){var n=e("./_defined");t.exports=function(e){return Object(n(e))}},{"./_defined":33}],92:[function(e,t,r){var n=e("./_is-object");t.exports=function(e,t){if(!n(e))return e;var r,o;if(t&&"function"==typeof(r=e.toString)&&!n(o=r.call(e)))return o;if("function"==typeof(r=e.valueOf)&&!n(o=r.call(e)))return o;if(!t&&"function"==typeof(r=e.toString)&&!n(o=r.call(e)))return o;throw TypeError("Can't convert object to primitive value")}},{"./_is-object":51}],93:[function(e,t,r){var n=0,o=Math.random();t.exports=function(e){return"Symbol(".concat(void 0===e?"":e,")_",(++n+o).toString(36))}},{}],94:[function(e,t,r){var n=e("./_global").navigator;t.exports=n&&n.userAgent||""},{"./_global":41}],95:[function(e,t,r){var n=e("./_global"),o=e("./_core"),a=e("./_library"),i=e("./_wks-ext"),s=e("./_object-dp").f;t.exports=function(e){var t=o.Symbol||(o.Symbol=a?{}:n.Symbol||{});"_"==e.charAt(0)||e in t||s(t,e,{value:i.f(e)})}},{"./_core":30,"./_global":41,"./_library":58,"./_object-dp":63,"./_wks-ext":96}],96:[function(e,t,r){r.f=e("./_wks")},{"./_wks":97}],97:[function(e,t,r){var n=e("./_shared")("wks"),o=e("./_uid"),a=e("./_global").Symbol,i="function"==typeof a;(t.exports=function(e){return n[e]||(n[e]=i&&a[e]||(i?a:o)("Symbol."+e))}).store=n},{"./_global":41,"./_shared":83,"./_uid":93}],98:[function(e,t,r){var n=e("./_classof"),o=e("./_wks")("iterator"),a=e("./_iterators");t.exports=e("./_core").getIteratorMethod=function(e){if(void 0!=e)return e[o]||e["@@iterator"]||a[n(e)]}},{"./_classof":28,"./_core":30,"./_iterators":57,"./_wks":97}],99:[function(e,t,r){var n=e("./_classof"),o=e("./_wks")("iterator"),a=e("./_iterators");t.exports=e("./_core").isIterable=function(e){var t=Object(e);return void 0!==t[o]||"@@iterator"in t||a.hasOwnProperty(n(t))}},{"./_classof":28,"./_core":30,"./_iterators":57,"./_wks":97}],100:[function(e,t,r){"use strict";var n=e("./_ctx"),o=e("./_export"),a=e("./_to-object"),i=e("./_iter-call"),s=e("./_is-array-iter"),u=e("./_to-length"),c=e("./_create-property"),f=e("./core.get-iterator-method");o(o.S+o.F*!e("./_iter-detect")(function(e){Array.from(e)}),"Array",{from:function(e){var t,r,o,l,p=a(e),d="function"==typeof this?this:Array,h=arguments.length,b=h>1?arguments[1]:void 0,v=void 0!==b,g=0,m=f(p);if(v&&(b=n(b,h>2?arguments[2]:void 0,2)),void 0==m||d==Array&&s(m))for(r=new d(t=u(p.length));t>g;g++)c(r,g,v?b(p[g],g):p[g]);else for(l=m.call(p),r=new d;!(o=l.next()).done;g++)c(r,g,v?i(l,b,[o.value,g],!0):o.value);return r.length=g,r}})},{"./_create-property":31,"./_ctx":32,"./_export":38,"./_is-array-iter":48,"./_iter-call":52,"./_iter-detect":55,"./_to-length":90,"./_to-object":91,"./core.get-iterator-method":98}],101:[function(e,t,r){"use strict";var n=e("./_add-to-unscopables"),o=e("./_iter-step"),a=e("./_iterators"),i=e("./_to-iobject");t.exports=e("./_iter-define")(Array,"Array",function(e,t){this._t=i(e),this._i=0,this._k=t},function(){var e=this._t,t=this._k,r=this._i++;return!e||r>=e.length?(this._t=void 0,o(1)):o(0,"keys"==t?r:"values"==t?e[r]:[r,e[r]])},"values"),a.Arguments=a.Array,n("keys"),n("values"),n("entries")},{"./_add-to-unscopables":24,"./_iter-define":54,"./_iter-step":56,"./_iterators":57,"./_to-iobject":89}],102:[function(e,t,r){var n=e("./_export");n(n.S,"Number",{isInteger:e("./_is-integer")})},{"./_export":38,"./_is-integer":50}],103:[function(e,t,r){var n=e("./_export");n(n.S,"Object",{create:e("./_object-create")})},{"./_export":38,"./_object-create":62}],104:[function(e,t,r){var n=e("./_export");n(n.S,"Object",{is:e("./_same-value")})},{"./_export":38,"./_same-value":79}],105:[function(e,t,r){var n=e("./_to-object"),o=e("./_object-keys");e("./_object-sap")("keys",function(){return function(e){return o(n(e))}})},{"./_object-keys":71,"./_object-sap":73,"./_to-object":91}],106:[function(e,t,r){},{}],107:[function(e,t,r){"use strict";var n,o,a,i,s=e("./_library"),u=e("./_global"),c=e("./_ctx"),f=e("./_classof"),l=e("./_export"),p=e("./_is-object"),d=e("./_a-function"),h=e("./_an-instance"),b=e("./_for-of"),v=e("./_species-constructor"),g=e("./_task").set,m=e("./_microtask")(),y=e("./_new-promise-capability"),_=e("./_perform"),x=e("./_user-agent"),k=e("./_promise-resolve"),w=u.TypeError,j=u.process,S=j&&j.versions,O=S&&S.v8||"",E=u.Promise,A="process"==f(j),T=function(){},P=o=y.f,Y=!!function(){try{var t=E.resolve(1),r=(t.constructor={})[e("./_wks")("species")]=function(e){e(T,T)};return(A||"function"==typeof PromiseRejectionEvent)&&t.then(T)instanceof r&&0!==O.indexOf("6.6")&&-1===x.indexOf("Chrome/66")}catch(e){}}(),D=function(e){var t;return!(!p(e)||"function"!=typeof(t=e.then))&&t},M=function(e,t){if(!e._n){e._n=!0;var r=e._c;m(function(){for(var n=e._v,o=1==e._s,a=0,i=function(t){var r,a,i,s=o?t.ok:t.fail,u=t.resolve,c=t.reject,f=t.domain;try{s?(o||(2==e._h&&F(e),e._h=1),!0===s?r=n:(f&&f.enter(),r=s(n),f&&(f.exit(),i=!0)),r===t.promise?c(w("Promise-chain cycle")):(a=D(r))?a.call(r,u,c):u(r)):c(n)}catch(e){f&&!i&&f.exit(),c(e)}};r.length>a;)i(r[a++]);e._c=[],e._n=!1,t&&!e._h&&L(e)})}},L=function(e){g.call(u,function(){var t,r,n,o=e._v,a=N(e);if(a&&(t=_(function(){A?j.emit("unhandledRejection",o,e):(r=u.onunhandledrejection)?r({promise:e,reason:o}):(n=u.console)&&n.error&&n.error("Unhandled promise rejection",o)}),e._h=A||N(e)?2:1),e._a=void 0,a&&t.e)throw t.v})},N=function(e){return 1!==e._h&&0===(e._a||e._c).length},F=function(e){g.call(u,function(){var t;A?j.emit("rejectionHandled",e):(t=u.onrejectionhandled)&&t({promise:e,reason:e._v})})},I=function(e){var t=this;t._d||(t._d=!0,(t=t._w||t)._v=e,t._s=2,t._a||(t._a=t._c.slice()),M(t,!0))},R=function(e){var t,r=this;if(!r._d){r._d=!0,r=r._w||r;try{if(r===e)throw w("Promise can't be resolved itself");(t=D(e))?m(function(){var n={_w:r,_d:!1};try{t.call(e,c(R,n,1),c(I,n,1))}catch(e){I.call(n,e)}}):(r._v=e,r._s=1,M(r,!1))}catch(e){I.call({_w:r,_d:!1},e)}}};Y||(E=function(e){h(this,E,"Promise","_h"),d(e),n.call(this);try{e(c(R,this,1),c(I,this,1))}catch(e){I.call(this,e)}},(n=function(e){this._c=[],this._a=void 0,this._s=0,this._d=!1,this._v=void 0,this._h=0,this._n=!1}).prototype=e("./_redefine-all")(E.prototype,{then:function(e,t){var r=P(v(this,E));return r.ok="function"!=typeof e||e,r.fail="function"==typeof t&&t,r.domain=A?j.domain:void 0,this._c.push(r),this._a&&this._a.push(r),this._s&&M(this,!1),r.promise},catch:function(e){return this.then(void 0,e)}}),a=function(){var e=new n;this.promise=e,this.resolve=c(R,e,1),this.reject=c(I,e,1)},y.f=P=function(e){return e===E||e===i?new a(e):o(e)}),l(l.G+l.W+l.F*!Y,{Promise:E}),e("./_set-to-string-tag")(E,"Promise"),e("./_set-species")("Promise"),i=e("./_core").Promise,l(l.S+l.F*!Y,"Promise",{reject:function(e){var t=P(this);return(0,t.reject)(e),t.promise}}),l(l.S+l.F*(s||!Y),"Promise",{resolve:function(e){return k(s&&this===i?E:this,e)}}),l(l.S+l.F*!(Y&&e("./_iter-detect")(function(e){E.all(e).catch(T)})),"Promise",{all:function(e){var t=this,r=P(t),n=r.resolve,o=r.reject,a=_(function(){var r=[],a=0,i=1;b(e,!1,function(e){var s=a++,u=!1;r.push(void 0),i++,t.resolve(e).then(function(e){u||(u=!0,r[s]=e,--i||n(r))},o)}),--i||n(r)});return a.e&&o(a.v),r.promise},race:function(e){var t=this,r=P(t),n=r.reject,o=_(function(){b(e,!1,function(e){t.resolve(e).then(r.resolve,n)})});return o.e&&n(o.v),r.promise}})},{"./_a-function":23,"./_an-instance":25,"./_classof":28,"./_core":30,"./_ctx":32,"./_export":38,"./_for-of":40,"./_global":41,"./_is-object":51,"./_iter-detect":55,"./_library":58,"./_microtask":60,"./_new-promise-capability":61,"./_perform":74,"./_promise-resolve":75,"./_redefine-all":77,"./_set-species":80,"./_set-to-string-tag":81,"./_species-constructor":84,"./_task":86,"./_user-agent":94,"./_wks":97}],108:[function(e,t,r){"use strict";var n=e("./_string-at")(!0);e("./_iter-define")(String,"String",function(e){this._t=String(e),this._i=0},function(){var e,t=this._t,r=this._i;return r>=t.length?{value:void 0,done:!0}:(e=n(t,r),this._i+=e.length,{value:e,done:!1})})},{"./_iter-define":54,"./_string-at":85}],109:[function(e,t,r){"use strict";var n=e("./_global"),o=e("./_has"),a=e("./_descriptors"),i=e("./_export"),s=e("./_redefine"),u=e("./_meta").KEY,c=e("./_fails"),f=e("./_shared"),l=e("./_set-to-string-tag"),p=e("./_uid"),d=e("./_wks"),h=e("./_wks-ext"),b=e("./_wks-define"),v=e("./_enum-keys"),g=e("./_is-array"),m=e("./_an-object"),y=e("./_is-object"),_=e("./_to-iobject"),x=e("./_to-primitive"),k=e("./_property-desc"),w=e("./_object-create"),j=e("./_object-gopn-ext"),S=e("./_object-gopd"),O=e("./_object-dp"),E=e("./_object-keys"),A=S.f,T=O.f,P=j.f,Y=n.Symbol,D=n.JSON,M=D&&D.stringify,L=d("_hidden"),N=d("toPrimitive"),F={}.propertyIsEnumerable,I=f("symbol-registry"),R=f("symbols"),C=f("op-symbols"),G=Object.prototype,$="function"==typeof Y,z=n.QObject,q=!z||!z.prototype||!z.prototype.findChild,U=a&&c(function(){return 7!=w(T({},"a",{get:function(){return T(this,"a",{value:7}).a}})).a})?function(e,t,r){var n=A(G,t);n&&delete G[t],T(e,t,r),n&&e!==G&&T(G,t,n)}:T,J=function(e){var t=R[e]=w(Y.prototype);return t._k=e,t},B=$&&"symbol"==typeof Y.iterator?function(e){return"symbol"==typeof e}:function(e){return e instanceof Y},W=function(e,t,r){return e===G&&W(C,t,r),m(e),t=x(t,!0),m(r),o(R,t)?(r.enumerable?(o(e,L)&&e[L][t]&&(e[L][t]=!1),r=w(r,{enumerable:k(0,!1)})):(o(e,L)||T(e,L,k(1,{})),e[L][t]=!0),U(e,t,r)):T(e,t,r)},V=function(e,t){m(e);for(var r,n=v(t=_(t)),o=0,a=n.length;a>o;)W(e,r=n[o++],t[r]);return e},K=function(e){var t=F.call(this,e=x(e,!0));return!(this===G&&o(R,e)&&!o(C,e))&&(!(t||!o(this,e)||!o(R,e)||o(this,L)&&this[L][e])||t)},H=function(e,t){if(e=_(e),t=x(t,!0),e!==G||!o(R,t)||o(C,t)){var r=A(e,t);return!r||!o(R,t)||o(e,L)&&e[L][t]||(r.enumerable=!0),r}},Q=function(e){for(var t,r=P(_(e)),n=[],a=0;r.length>a;)o(R,t=r[a++])||t==L||t==u||n.push(t);return n},Z=function(e){for(var t,r=e===G,n=P(r?C:_(e)),a=[],i=0;n.length>i;)!o(R,t=n[i++])||r&&!o(G,t)||a.push(R[t]);return a};$||(s((Y=function(){if(this instanceof Y)throw TypeError("Symbol is not a constructor!");var e=p(arguments.length>0?arguments[0]:void 0),t=function(r){this===G&&t.call(C,r),o(this,L)&&o(this[L],e)&&(this[L][e]=!1),U(this,e,k(1,r))};return a&&q&&U(G,e,{configurable:!0,set:t}),J(e)}).prototype,"toString",function(){return this._k}),S.f=H,O.f=W,e("./_object-gopn").f=j.f=Q,e("./_object-pie").f=K,e("./_object-gops").f=Z,a&&!e("./_library")&&s(G,"propertyIsEnumerable",K,!0),h.f=function(e){return J(d(e))}),i(i.G+i.W+i.F*!$,{Symbol:Y});for(var X="hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables".split(","),ee=0;X.length>ee;)d(X[ee++]);for(var te=E(d.store),re=0;te.length>re;)b(te[re++]);i(i.S+i.F*!$,"Symbol",{for:function(e){return o(I,e+="")?I[e]:I[e]=Y(e)},keyFor:function(e){if(!B(e))throw TypeError(e+" is not a symbol!");for(var t in I)if(I[t]===e)return t},useSetter:function(){q=!0},useSimple:function(){q=!1}}),i(i.S+i.F*!$,"Object",{create:function(e,t){return void 0===t?w(e):V(w(e),t)},defineProperty:W,defineProperties:V,getOwnPropertyDescriptor:H,getOwnPropertyNames:Q,getOwnPropertySymbols:Z}),D&&i(i.S+i.F*(!$||c(function(){var e=Y();return"[null]"!=M([e])||"{}"!=M({a:e})||"{}"!=M(Object(e))})),"JSON",{stringify:function(e){for(var t,r,n=[e],o=1;arguments.length>o;)n.push(arguments[o++]);if(r=t=n[1],(y(t)||void 0!==e)&&!B(e))return g(t)||(t=function(e,t){if("function"==typeof r&&(t=r.call(this,e,t)),!B(t))return t}),n[1]=t,M.apply(D,n)}}),Y.prototype[N]||e("./_hide")(Y.prototype,N,Y.prototype.valueOf),l(Y,"Symbol"),l(Math,"Math",!0),l(n.JSON,"JSON",!0)},{"./_an-object":26,"./_descriptors":34,"./_enum-keys":37,"./_export":38,"./_fails":39,"./_global":41,"./_has":42,"./_hide":43,"./_is-array":49,"./_is-object":51,"./_library":58,"./_meta":59,"./_object-create":62,"./_object-dp":63,"./_object-gopd":65,"./_object-gopn":67,"./_object-gopn-ext":66,"./_object-gops":68,"./_object-keys":71,"./_object-pie":72,"./_property-desc":76,"./_redefine":78,"./_set-to-string-tag":81,"./_shared":83,"./_to-iobject":89,"./_to-primitive":92,"./_uid":93,"./_wks":97,"./_wks-define":95,"./_wks-ext":96}],110:[function(e,t,r){"use strict";var n=e("./_export"),o=e("./_core"),a=e("./_global"),i=e("./_species-constructor"),s=e("./_promise-resolve");n(n.P+n.R,"Promise",{finally:function(e){var t=i(this,o.Promise||a.Promise),r="function"==typeof e;return this.then(r?function(r){return s(t,e()).then(function(){return r})}:e,r?function(r){return s(t,e()).then(function(){throw r})}:e)}})},{"./_core":30,"./_export":38,"./_global":41,"./_promise-resolve":75,"./_species-constructor":84}],111:[function(e,t,r){"use strict";var n=e("./_export"),o=e("./_new-promise-capability"),a=e("./_perform");n(n.S,"Promise",{try:function(e){var t=o.f(this),r=a(e);return(r.e?t.reject:t.resolve)(r.v),t.promise}})},{"./_export":38,"./_new-promise-capability":61,"./_perform":74}],112:[function(e,t,r){e("./_wks-define")("asyncIterator")},{"./_wks-define":95}],113:[function(e,t,r){e("./_wks-define")("observable")},{"./_wks-define":95}],114:[function(e,t,r){e("./es6.array.iterator");for(var n=e("./_global"),o=e("./_hide"),a=e("./_iterators"),i=e("./_wks")("toStringTag"),s="CSSRuleList,CSSStyleDeclaration,CSSValueList,ClientRectList,DOMRectList,DOMStringList,DOMTokenList,DataTransferItemList,FileList,HTMLAllCollection,HTMLCollection,HTMLFormElement,HTMLSelectElement,MediaList,MimeTypeArray,NamedNodeMap,NodeList,PaintRequestList,Plugin,PluginArray,SVGLengthList,SVGNumberList,SVGPathSegList,SVGPointList,SVGStringList,SVGTransformList,SourceBufferList,StyleSheetList,TextTrackCueList,TextTrackList,TouchList".split(","),u=0;u<s.length;u++){var c=s[u],f=n[c],l=f&&f.prototype;l&&!l[i]&&o(l,i,c),a[c]=a.Array}},{"./_global":41,"./_hide":43,"./_iterators":57,"./_wks":97,"./es6.array.iterator":101}],115:[function(e,t,r){var n=function(){return this}()||Function("return this")(),o=n.regeneratorRuntime&&Object.getOwnPropertyNames(n).indexOf("regeneratorRuntime")>=0,a=o&&n.regeneratorRuntime;if(n.regeneratorRuntime=void 0,t.exports=e("./runtime"),o)n.regeneratorRuntime=a;else try{delete n.regeneratorRuntime}catch(e){n.regeneratorRuntime=void 0}},{"./runtime":116}],116:[function(e,t,r){!function(e){"use strict";var r,n=Object.prototype,o=n.hasOwnProperty,a="function"==typeof Symbol?Symbol:{},i=a.iterator||"@@iterator",s=a.asyncIterator||"@@asyncIterator",u=a.toStringTag||"@@toStringTag",c="object"==typeof t,f=e.regeneratorRuntime;if(f)c&&(t.exports=f);else{(f=e.regeneratorRuntime=c?t.exports:{}).wrap=_;var l="suspendedStart",p="suspendedYield",d="executing",h="completed",b={},v={};v[i]=function(){return this};var g=Object.getPrototypeOf,m=g&&g(g(Y([])));m&&m!==n&&o.call(m,i)&&(v=m);var y=j.prototype=k.prototype=Object.create(v);w.prototype=y.constructor=j,j.constructor=w,j[u]=w.displayName="GeneratorFunction",f.isGeneratorFunction=function(e){var t="function"==typeof e&&e.constructor;return!!t&&(t===w||"GeneratorFunction"===(t.displayName||t.name))},f.mark=function(e){return Object.setPrototypeOf?Object.setPrototypeOf(e,j):(e.__proto__=j,u in e||(e[u]="GeneratorFunction")),e.prototype=Object.create(y),e},f.awrap=function(e){return{__await:e}},S(O.prototype),O.prototype[s]=function(){return this},f.AsyncIterator=O,f.async=function(e,t,r,n){var o=new O(_(e,t,r,n));return f.isGeneratorFunction(t)?o:o.next().then(function(e){return e.done?e.value:o.next()})},S(y),y[u]="Generator",y[i]=function(){return this},y.toString=function(){return"[object Generator]"},f.keys=function(e){var t=[];for(var r in e)t.push(r);return t.reverse(),function r(){for(;t.length;){var n=t.pop();if(n in e)return r.value=n,r.done=!1,r}return r.done=!0,r}},f.values=Y,P.prototype={constructor:P,reset:function(e){if(this.prev=0,this.next=0,this.sent=this._sent=r,this.done=!1,this.delegate=null,this.method="next",this.arg=r,this.tryEntries.forEach(T),!e)for(var t in this)"t"===t.charAt(0)&&o.call(this,t)&&!isNaN(+t.slice(1))&&(this[t]=r)},stop:function(){this.done=!0;var e=this.tryEntries[0].completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(e){if(this.done)throw e;var t=this;function n(n,o){return s.type="throw",s.arg=e,t.next=n,o&&(t.method="next",t.arg=r),!!o}for(var a=this.tryEntries.length-1;a>=0;--a){var i=this.tryEntries[a],s=i.completion;if("root"===i.tryLoc)return n("end");if(i.tryLoc<=this.prev){var u=o.call(i,"catchLoc"),c=o.call(i,"finallyLoc");if(u&&c){if(this.prev<i.catchLoc)return n(i.catchLoc,!0);if(this.prev<i.finallyLoc)return n(i.finallyLoc)}else if(u){if(this.prev<i.catchLoc)return n(i.catchLoc,!0)}else{if(!c)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return n(i.finallyLoc)}}}},abrupt:function(e,t){for(var r=this.tryEntries.length-1;r>=0;--r){var n=this.tryEntries[r];if(n.tryLoc<=this.prev&&o.call(n,"finallyLoc")&&this.prev<n.finallyLoc){var a=n;break}}a&&("break"===e||"continue"===e)&&a.tryLoc<=t&&t<=a.finallyLoc&&(a=null);var i=a?a.completion:{};return i.type=e,i.arg=t,a?(this.method="next",this.next=a.finallyLoc,b):this.complete(i)},complete:function(e,t){if("throw"===e.type)throw e.arg;return"break"===e.type||"continue"===e.type?this.next=e.arg:"return"===e.type?(this.rval=this.arg=e.arg,this.method="return",this.next="end"):"normal"===e.type&&t&&(this.next=t),b},finish:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.finallyLoc===e)return this.complete(r.completion,r.afterLoc),T(r),b}},catch:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.tryLoc===e){var n=r.completion;if("throw"===n.type){var o=n.arg;T(r)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(e,t,n){return this.delegate={iterator:Y(e),resultName:t,nextLoc:n},"next"===this.method&&(this.arg=r),b}}}function _(e,t,r,n){var o=t&&t.prototype instanceof k?t:k,a=Object.create(o.prototype),i=new P(n||[]);return a._invoke=function(e,t,r){var n=l;return function(o,a){if(n===d)throw new Error("Generator is already running");if(n===h){if("throw"===o)throw a;return D()}for(r.method=o,r.arg=a;;){var i=r.delegate;if(i){var s=E(i,r);if(s){if(s===b)continue;return s}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if(n===l)throw n=h,r.arg;r.dispatchException(r.arg)}else"return"===r.method&&r.abrupt("return",r.arg);n=d;var u=x(e,t,r);if("normal"===u.type){if(n=r.done?h:p,u.arg===b)continue;return{value:u.arg,done:r.done}}"throw"===u.type&&(n=h,r.method="throw",r.arg=u.arg)}}}(e,r,i),a}function x(e,t,r){try{return{type:"normal",arg:e.call(t,r)}}catch(e){return{type:"throw",arg:e}}}function k(){}function w(){}function j(){}function S(e){["next","throw","return"].forEach(function(t){e[t]=function(e){return this._invoke(t,e)}})}function O(e){var t;this._invoke=function(r,n){function a(){return new Promise(function(t,a){!function t(r,n,a,i){var s=x(e[r],e,n);if("throw"!==s.type){var u=s.arg,c=u.value;return c&&"object"==typeof c&&o.call(c,"__await")?Promise.resolve(c.__await).then(function(e){t("next",e,a,i)},function(e){t("throw",e,a,i)}):Promise.resolve(c).then(function(e){u.value=e,a(u)},i)}i(s.arg)}(r,n,t,a)})}return t=t?t.then(a,a):a()}}function E(e,t){var n=e.iterator[t.method];if(n===r){if(t.delegate=null,"throw"===t.method){if(e.iterator.return&&(t.method="return",t.arg=r,E(e,t),"throw"===t.method))return b;t.method="throw",t.arg=new TypeError("The iterator does not provide a 'throw' method")}return b}var o=x(n,e.iterator,t.arg);if("throw"===o.type)return t.method="throw",t.arg=o.arg,t.delegate=null,b;var a=o.arg;return a?a.done?(t[e.resultName]=a.value,t.next=e.nextLoc,"return"!==t.method&&(t.method="next",t.arg=r),t.delegate=null,b):a:(t.method="throw",t.arg=new TypeError("iterator result is not an object"),t.delegate=null,b)}function A(e){var t={tryLoc:e[0]};1 in e&&(t.catchLoc=e[1]),2 in e&&(t.finallyLoc=e[2],t.afterLoc=e[3]),this.tryEntries.push(t)}function T(e){var t=e.completion||{};t.type="normal",delete t.arg,e.completion=t}function P(e){this.tryEntries=[{tryLoc:"root"}],e.forEach(A,this),this.reset(!0)}function Y(e){if(e){var t=e[i];if(t)return t.call(e);if("function"==typeof e.next)return e;if(!isNaN(e.length)){var n=-1,a=function t(){for(;++n<e.length;)if(o.call(e,n))return t.value=e[n],t.done=!1,t;return t.value=r,t.done=!0,t};return a.next=a}}return{next:D}}function D(){return{value:r,done:!0}}}(function(){return this}()||Function("return this")())},{}]},{},[1])(1)});;// jsonata-es5.min.js is prepended to this file as part of the Grunt build

;(function(window) {
    if (typeof window.window != "undefined" && window.document)
    return;
    if (window.require && window.define)
    return;

    if (!window.console) {
        window.console = function() {
            var msgs = Array.prototype.slice.call(arguments, 0);
            postMessage({type: "log", data: msgs});
        };
        window.console.error =
        window.console.warn =
        window.console.log =
        window.console.trace = window.console;
    }
    window.window = window;
    window.ace = window;
    window.onerror = function(message, file, line, col, err) {
        postMessage({type: "error", data: {
            message: message,
            data: err.data,
            file: file,
            line: line,
            col: col,
            stack: err.stack
        }});
    };

    window.normalizeModule = function(parentId, moduleName) {
        // normalize plugin requires
        if (moduleName.indexOf("!") !== -1) {
            var chunks = moduleName.split("!");
            return window.normalizeModule(parentId, chunks[0]) + "!" + window.normalizeModule(parentId, chunks[1]);
        }
        // normalize relative requires
        if (moduleName.charAt(0) == ".") {
            var base = parentId.split("/").slice(0, -1).join("/");
            moduleName = (base ? base + "/" : "") + moduleName;

            while (moduleName.indexOf(".") !== -1 && previous != moduleName) {
                var previous = moduleName;
                moduleName = moduleName.replace(/^\.\//, "").replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
            }
        }

        return moduleName;
    };

    window.require = function require(parentId, id) {
        if (!id) {
            id = parentId;
            parentId = null;
        }
        if (!id.charAt)
        throw new Error("worker.js require() accepts only (parentId, id) as arguments");

        id = window.normalizeModule(parentId, id);

        var module = window.require.modules[id];
        if (module) {
            if (!module.initialized) {
                module.initialized = true;
                module.exports = module.factory().exports;
            }
            return module.exports;
        }

        if (!window.require.tlns)
        return console.log("unable to load " + id);

        var path = resolveModuleId(id, window.require.tlns);
        if (path.slice(-3) != ".js") path += ".js";

        window.require.id = id;
        window.require.modules[id] = {}; // prevent infinite loop on broken modules
        importScripts(path);
        return window.require(parentId, id);
    };
    function resolveModuleId(id, paths) {
        var testPath = id, tail = "";
        while (testPath) {
            var alias = paths[testPath];
            if (typeof alias == "string") {
                return alias + tail;
            } else if (alias) {
                return  alias.location.replace(/\/*$/, "/") + (tail || alias.main || alias.name);
            } else if (alias === false) {
                return "";
            }
            var i = testPath.lastIndexOf("/");
            if (i === -1) break;
            tail = testPath.substr(i) + tail;
            testPath = testPath.slice(0, i);
        }
        return id;
    }
    window.require.modules = {};
    window.require.tlns = {};

    window.define = function(id, deps, factory) {
        if (arguments.length == 2) {
            factory = deps;
            if (typeof id != "string") {
                deps = id;
                id = window.require.id;
            }
        } else if (arguments.length == 1) {
            factory = id;
            deps = [];
            id = window.require.id;
        }

        if (typeof factory != "function") {
            window.require.modules[id] = {
                exports: factory,
                initialized: true
            };
            return;
        }

        if (!deps.length)
        // If there is no dependencies, we inject "require", "exports" and
        // "module" as dependencies, to provide CommonJS compatibility.
        deps = ["require", "exports", "module"];

        var req = function(childId) {
            return window.require(id, childId);
        };

        window.require.modules[id] = {
            exports: {},
            factory: function() {
                var module = this;
                var returnExports = factory.apply(this, deps.map(function(dep) {
                    switch (dep) {
                        // Because "require", "exports" and "module" aren't actual
                        // dependencies, we must handle them seperately.
                        case "require": return req;
                        case "exports": return module.exports;
                        case "module":  return module;
                        // But for all other dependencies, we can just go ahead and
                        // require them.
                        default:        return req(dep);
                    }
                }));
                if (returnExports)
                module.exports = returnExports;
                return module;
            }
        };
    };
    window.define.amd = {};
    require.tlns = {};
    window.initBaseUrls  = function initBaseUrls(topLevelNamespaces) {
        for (var i in topLevelNamespaces)
        require.tlns[i] = topLevelNamespaces[i];
    };

    window.initSender = function initSender() {

        var EventEmitter = window.require("ace/lib/event_emitter").EventEmitter;
        var oop = window.require("ace/lib/oop");

        var Sender = function() {};

        (function() {

            oop.implement(this, EventEmitter);

            this.callback = function(data, callbackId) {
                postMessage({
                    type: "call",
                    id: callbackId,
                    data: data
                });
            };

            this.emit = function(name, data) {
                postMessage({
                    type: "event",
                    name: name,
                    data: data
                });
            };

        }).call(Sender.prototype);

        return new Sender();
    };

    var main = window.main = null;
    var sender = window.sender = null;

    window.onmessage = function(e) {
        var msg = e.data;
        if (msg.event && sender) {
            sender._signal(msg.event, msg.data);
        }
        else if (msg.command) {
            if (main[msg.command])
            main[msg.command].apply(main, msg.args);
            else if (window[msg.command])
            window[msg.command].apply(window, msg.args);
            else
            throw new Error("Unknown command:" + msg.command);
        }
        else if (msg.init) {
            window.initBaseUrls(msg.tlns);
            require("ace/lib/es5-shim");
            sender = window.sender = window.initSender();
            var clazz = require(msg.module)[msg.classname];
            main = window.main = new clazz(sender);
        }
    };
})(this);

define("ace/lib/oop",["require","exports","module"], function(require, exports, module) {
    "use strict";

    exports.inherits = function(ctor, superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    };

    exports.mixin = function(obj, mixin) {
        for (var key in mixin) {
            obj[key] = mixin[key];
        }
        return obj;
    };

    exports.implement = function(proto, mixin) {
        exports.mixin(proto, mixin);
    };

});

define("ace/range",["require","exports","module"], function(require, exports, module) {
    "use strict";
    var comparePoints = function(p1, p2) {
        return p1.row - p2.row || p1.column - p2.column;
    };
    var Range = function(startRow, startColumn, endRow, endColumn) {
        this.start = {
            row: startRow,
            column: startColumn
        };

        this.end = {
            row: endRow,
            column: endColumn
        };
    };

    (function() {
        this.isEqual = function(range) {
            return this.start.row === range.start.row &&
            this.end.row === range.end.row &&
            this.start.column === range.start.column &&
            this.end.column === range.end.column;
        };
        this.toString = function() {
            return ("Range: [" + this.start.row + "/" + this.start.column +
            "] -> [" + this.end.row + "/" + this.end.column + "]");
        };

        this.contains = function(row, column) {
            return this.compare(row, column) == 0;
        };
        this.compareRange = function(range) {
            var cmp,
            end = range.end,
            start = range.start;

            cmp = this.compare(end.row, end.column);
            if (cmp == 1) {
                cmp = this.compare(start.row, start.column);
                if (cmp == 1) {
                    return 2;
                } else if (cmp == 0) {
                    return 1;
                } else {
                    return 0;
                }
            } else if (cmp == -1) {
                return -2;
            } else {
                cmp = this.compare(start.row, start.column);
                if (cmp == -1) {
                    return -1;
                } else if (cmp == 1) {
                    return 42;
                } else {
                    return 0;
                }
            }
        };
        this.comparePoint = function(p) {
            return this.compare(p.row, p.column);
        };
        this.containsRange = function(range) {
            return this.comparePoint(range.start) == 0 && this.comparePoint(range.end) == 0;
        };
        this.intersects = function(range) {
            var cmp = this.compareRange(range);
            return (cmp == -1 || cmp == 0 || cmp == 1);
        };
        this.isEnd = function(row, column) {
            return this.end.row == row && this.end.column == column;
        };
        this.isStart = function(row, column) {
            return this.start.row == row && this.start.column == column;
        };
        this.setStart = function(row, column) {
            if (typeof row == "object") {
                this.start.column = row.column;
                this.start.row = row.row;
            } else {
                this.start.row = row;
                this.start.column = column;
            }
        };
        this.setEnd = function(row, column) {
            if (typeof row == "object") {
                this.end.column = row.column;
                this.end.row = row.row;
            } else {
                this.end.row = row;
                this.end.column = column;
            }
        };
        this.inside = function(row, column) {
            if (this.compare(row, column) == 0) {
                if (this.isEnd(row, column) || this.isStart(row, column)) {
                    return false;
                } else {
                    return true;
                }
            }
            return false;
        };
        this.insideStart = function(row, column) {
            if (this.compare(row, column) == 0) {
                if (this.isEnd(row, column)) {
                    return false;
                } else {
                    return true;
                }
            }
            return false;
        };
        this.insideEnd = function(row, column) {
            if (this.compare(row, column) == 0) {
                if (this.isStart(row, column)) {
                    return false;
                } else {
                    return true;
                }
            }
            return false;
        };
        this.compare = function(row, column) {
            if (!this.isMultiLine()) {
                if (row === this.start.row) {
                    return column < this.start.column ? -1 : (column > this.end.column ? 1 : 0);
                }
            }

            if (row < this.start.row)
            return -1;

            if (row > this.end.row)
            return 1;

            if (this.start.row === row)
            return column >= this.start.column ? 0 : -1;

            if (this.end.row === row)
            return column <= this.end.column ? 0 : 1;

            return 0;
        };
        this.compareStart = function(row, column) {
            if (this.start.row == row && this.start.column == column) {
                return -1;
            } else {
                return this.compare(row, column);
            }
        };
        this.compareEnd = function(row, column) {
            if (this.end.row == row && this.end.column == column) {
                return 1;
            } else {
                return this.compare(row, column);
            }
        };
        this.compareInside = function(row, column) {
            if (this.end.row == row && this.end.column == column) {
                return 1;
            } else if (this.start.row == row && this.start.column == column) {
                return -1;
            } else {
                return this.compare(row, column);
            }
        };
        this.clipRows = function(firstRow, lastRow) {
            if (this.end.row > lastRow)
            var end = {row: lastRow + 1, column: 0};
            else if (this.end.row < firstRow)
            var end = {row: firstRow, column: 0};

            if (this.start.row > lastRow)
            var start = {row: lastRow + 1, column: 0};
            else if (this.start.row < firstRow)
            var start = {row: firstRow, column: 0};

            return Range.fromPoints(start || this.start, end || this.end);
        };
        this.extend = function(row, column) {
            var cmp = this.compare(row, column);

            if (cmp == 0)
            return this;
            else if (cmp == -1)
            var start = {row: row, column: column};
            else
            var end = {row: row, column: column};

            return Range.fromPoints(start || this.start, end || this.end);
        };

        this.isEmpty = function() {
            return (this.start.row === this.end.row && this.start.column === this.end.column);
        };
        this.isMultiLine = function() {
            return (this.start.row !== this.end.row);
        };
        this.clone = function() {
            return Range.fromPoints(this.start, this.end);
        };
        this.collapseRows = function() {
            if (this.end.column == 0)
            return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row-1), 0)
            else
            return new Range(this.start.row, 0, this.end.row, 0)
        };
        this.toScreenRange = function(session) {
            var screenPosStart = session.documentToScreenPosition(this.start);
            var screenPosEnd = session.documentToScreenPosition(this.end);

            return new Range(
                screenPosStart.row, screenPosStart.column,
                screenPosEnd.row, screenPosEnd.column
            );
        };
        this.moveBy = function(row, column) {
            this.start.row += row;
            this.start.column += column;
            this.end.row += row;
            this.end.column += column;
        };

    }).call(Range.prototype);
    Range.fromPoints = function(start, end) {
        return new Range(start.row, start.column, end.row, end.column);
    };
    Range.comparePoints = comparePoints;

    Range.comparePoints = function(p1, p2) {
        return p1.row - p2.row || p1.column - p2.column;
    };


    exports.Range = Range;
});

define("ace/apply_delta",["require","exports","module"], function(require, exports, module) {
    "use strict";

    function throwDeltaError(delta, errorText){
        console.log("Invalid Delta:", delta);
        throw "Invalid Delta: " + errorText;
    }

    function positionInDocument(docLines, position) {
        return position.row    >= 0 && position.row    <  docLines.length &&
        position.column >= 0 && position.column <= docLines[position.row].length;
    }

    function validateDelta(docLines, delta) {
        if (delta.action != "insert" && delta.action != "remove")
        throwDeltaError(delta, "delta.action must be 'insert' or 'remove'");
        if (!(delta.lines instanceof Array))
        throwDeltaError(delta, "delta.lines must be an Array");
        if (!delta.start || !delta.end)
        throwDeltaError(delta, "delta.start/end must be an present");
        var start = delta.start;
        if (!positionInDocument(docLines, delta.start))
        throwDeltaError(delta, "delta.start must be contained in document");
        var end = delta.end;
        if (delta.action == "remove" && !positionInDocument(docLines, end))
        throwDeltaError(delta, "delta.end must contained in document for 'remove' actions");
        var numRangeRows = end.row - start.row;
        var numRangeLastLineChars = (end.column - (numRangeRows == 0 ? start.column : 0));
        if (numRangeRows != delta.lines.length - 1 || delta.lines[numRangeRows].length != numRangeLastLineChars)
        throwDeltaError(delta, "delta.range must match delta lines");
    }

    exports.applyDelta = function(docLines, delta, doNotValidate) {

        var row = delta.start.row;
        var startColumn = delta.start.column;
        var line = docLines[row] || "";
        switch (delta.action) {
            case "insert":
            var lines = delta.lines;
            if (lines.length === 1) {
                docLines[row] = line.substring(0, startColumn) + delta.lines[0] + line.substring(startColumn);
            } else {
                var args = [row, 1].concat(delta.lines);
                docLines.splice.apply(docLines, args);
                docLines[row] = line.substring(0, startColumn) + docLines[row];
                docLines[row + delta.lines.length - 1] += line.substring(startColumn);
            }
            break;
            case "remove":
            var endColumn = delta.end.column;
            var endRow = delta.end.row;
            if (row === endRow) {
                docLines[row] = line.substring(0, startColumn) + line.substring(endColumn);
            } else {
                docLines.splice(
                    row, endRow - row + 1,
                    line.substring(0, startColumn) + docLines[endRow].substring(endColumn)
                );
            }
            break;
        }
    }
});

define("ace/lib/event_emitter",["require","exports","module"], function(require, exports, module) {
    "use strict";

    var EventEmitter = {};
    var stopPropagation = function() { this.propagationStopped = true; };
    var preventDefault = function() { this.defaultPrevented = true; };

    EventEmitter._emit =
    EventEmitter._dispatchEvent = function(eventName, e) {
        this._eventRegistry || (this._eventRegistry = {});
        this._defaultHandlers || (this._defaultHandlers = {});

        var listeners = this._eventRegistry[eventName] || [];
        var defaultHandler = this._defaultHandlers[eventName];
        if (!listeners.length && !defaultHandler)
        return;

        if (typeof e != "object" || !e)
        e = {};

        if (!e.type)
        e.type = eventName;
        if (!e.stopPropagation)
        e.stopPropagation = stopPropagation;
        if (!e.preventDefault)
        e.preventDefault = preventDefault;

        listeners = listeners.slice();
        for (var i=0; i<listeners.length; i++) {
            listeners[i](e, this);
            if (e.propagationStopped)
            break;
        }

        if (defaultHandler && !e.defaultPrevented)
        return defaultHandler(e, this);
    };


    EventEmitter._signal = function(eventName, e) {
        var listeners = (this._eventRegistry || {})[eventName];
        if (!listeners)
        return;
        listeners = listeners.slice();
        for (var i=0; i<listeners.length; i++)
        listeners[i](e, this);
    };

    EventEmitter.once = function(eventName, callback) {
        var _self = this;
        callback && this.addEventListener(eventName, function newCallback() {
            _self.removeEventListener(eventName, newCallback);
            callback.apply(null, arguments);
        });
    };


    EventEmitter.setDefaultHandler = function(eventName, callback) {
        var handlers = this._defaultHandlers
        if (!handlers)
        handlers = this._defaultHandlers = {_disabled_: {}};

        if (handlers[eventName]) {
            var old = handlers[eventName];
            var disabled = handlers._disabled_[eventName];
            if (!disabled)
            handlers._disabled_[eventName] = disabled = [];
            disabled.push(old);
            var i = disabled.indexOf(callback);
            if (i != -1)
            disabled.splice(i, 1);
        }
        handlers[eventName] = callback;
    };
    EventEmitter.removeDefaultHandler = function(eventName, callback) {
        var handlers = this._defaultHandlers
        if (!handlers)
        return;
        var disabled = handlers._disabled_[eventName];

        if (handlers[eventName] == callback) {
            var old = handlers[eventName];
            if (disabled)
            this.setDefaultHandler(eventName, disabled.pop());
        } else if (disabled) {
            var i = disabled.indexOf(callback);
            if (i != -1)
            disabled.splice(i, 1);
        }
    };

    EventEmitter.on =
    EventEmitter.addEventListener = function(eventName, callback, capturing) {
        this._eventRegistry = this._eventRegistry || {};

        var listeners = this._eventRegistry[eventName];
        if (!listeners)
        listeners = this._eventRegistry[eventName] = [];

        if (listeners.indexOf(callback) == -1)
        listeners[capturing ? "unshift" : "push"](callback);
        return callback;
    };

    EventEmitter.off =
    EventEmitter.removeListener =
    EventEmitter.removeEventListener = function(eventName, callback) {
        this._eventRegistry = this._eventRegistry || {};

        var listeners = this._eventRegistry[eventName];
        if (!listeners)
        return;

        var index = listeners.indexOf(callback);
        if (index !== -1)
        listeners.splice(index, 1);
    };

    EventEmitter.removeAllListeners = function(eventName) {
        if (this._eventRegistry) this._eventRegistry[eventName] = [];
    };

    exports.EventEmitter = EventEmitter;

});

define("ace/anchor",["require","exports","module","ace/lib/oop","ace/lib/event_emitter"], function(require, exports, module) {
    "use strict";

    var oop = require("./lib/oop");
    var EventEmitter = require("./lib/event_emitter").EventEmitter;

    var Anchor = exports.Anchor = function(doc, row, column) {
        this.$onChange = this.onChange.bind(this);
        this.attach(doc);

        if (typeof column == "undefined")
        this.setPosition(row.row, row.column);
        else
        this.setPosition(row, column);
    };

    (function() {

        oop.implement(this, EventEmitter);
        this.getPosition = function() {
            return this.$clipPositionToDocument(this.row, this.column);
        };
        this.getDocument = function() {
            return this.document;
        };
        this.$insertRight = false;
        this.onChange = function(delta) {
            if (delta.start.row == delta.end.row && delta.start.row != this.row)
            return;

            if (delta.start.row > this.row)
            return;

            var point = $getTransformedPoint(delta, {row: this.row, column: this.column}, this.$insertRight);
            this.setPosition(point.row, point.column, true);
        };

        function $pointsInOrder(point1, point2, equalPointsInOrder) {
            var bColIsAfter = equalPointsInOrder ? point1.column <= point2.column : point1.column < point2.column;
            return (point1.row < point2.row) || (point1.row == point2.row && bColIsAfter);
        }

        function $getTransformedPoint(delta, point, moveIfEqual) {
            var deltaIsInsert = delta.action == "insert";
            var deltaRowShift = (deltaIsInsert ? 1 : -1) * (delta.end.row    - delta.start.row);
            var deltaColShift = (deltaIsInsert ? 1 : -1) * (delta.end.column - delta.start.column);
            var deltaStart = delta.start;
            var deltaEnd = deltaIsInsert ? deltaStart : delta.end; // Collapse insert range.
            if ($pointsInOrder(point, deltaStart, moveIfEqual)) {
                return {
                    row: point.row,
                    column: point.column
                };
            }
            if ($pointsInOrder(deltaEnd, point, !moveIfEqual)) {
                return {
                    row: point.row + deltaRowShift,
                    column: point.column + (point.row == deltaEnd.row ? deltaColShift : 0)
                };
            }

            return {
                row: deltaStart.row,
                column: deltaStart.column
            };
        }
        this.setPosition = function(row, column, noClip) {
            var pos;
            if (noClip) {
                pos = {
                    row: row,
                    column: column
                };
            } else {
                pos = this.$clipPositionToDocument(row, column);
            }

            if (this.row == pos.row && this.column == pos.column)
            return;

            var old = {
                row: this.row,
                column: this.column
            };

            this.row = pos.row;
            this.column = pos.column;
            this._signal("change", {
                old: old,
                value: pos
            });
        };
        this.detach = function() {
            this.document.removeEventListener("change", this.$onChange);
        };
        this.attach = function(doc) {
            this.document = doc || this.document;
            this.document.on("change", this.$onChange);
        };
        this.$clipPositionToDocument = function(row, column) {
            var pos = {};

            if (row >= this.document.getLength()) {
                pos.row = Math.max(0, this.document.getLength() - 1);
                pos.column = this.document.getLine(pos.row).length;
            }
            else if (row < 0) {
                pos.row = 0;
                pos.column = 0;
            }
            else {
                pos.row = row;
                pos.column = Math.min(this.document.getLine(pos.row).length, Math.max(0, column));
            }

            if (column < 0)
            pos.column = 0;

            return pos;
        };

    }).call(Anchor.prototype);

});

define("ace/document",["require","exports","module","ace/lib/oop","ace/apply_delta","ace/lib/event_emitter","ace/range","ace/anchor"], function(require, exports, module) {
    "use strict";
    var oop = require("./lib/oop");
    var applyDelta = require("./apply_delta").applyDelta;
    var EventEmitter = require("./lib/event_emitter").EventEmitter;
    var Range = require("./range").Range;
    var Anchor = require("./anchor").Anchor;

    var Document = function(textOrLines) {
        this.$lines = [""];
        if (textOrLines.length === 0) {
            this.$lines = [""];
        } else if (Array.isArray(textOrLines)) {
            this.insertMergedLines({row: 0, column: 0}, textOrLines);
        } else {
            this.insert({row: 0, column:0}, textOrLines);
        }
    };

    (function() {

        oop.implement(this, EventEmitter);
        this.setValue = function(text) {
            var len = this.getLength() - 1;
            this.remove(new Range(0, 0, len, this.getLine(len).length));
            this.insert({row: 0, column: 0}, text);
        };
        this.getValue = function() {
            return this.getAllLines().join(this.getNewLineCharacter());
        };
        this.createAnchor = function(row, column) {
            return new Anchor(this, row, column);
        };
        if ("aaa".split(/a/).length === 0) {
            this.$split = function(text) {
                return text.replace(/\r\n|\r/g, "\n").split("\n");
            };
        } else {
            this.$split = function(text) {
                return text.split(/\r\n|\r|\n/);
            };
        }


        this.$detectNewLine = function(text) {
            var match = text.match(/^.*?(\r\n|\r|\n)/m);
            this.$autoNewLine = match ? match[1] : "\n";
            this._signal("changeNewLineMode");
        };
        this.getNewLineCharacter = function() {
            switch (this.$newLineMode) {
                case "windows":
                return "\r\n";
                case "unix":
                return "\n";
                default:
                return this.$autoNewLine || "\n";
            }
        };

        this.$autoNewLine = "";
        this.$newLineMode = "auto";
        this.setNewLineMode = function(newLineMode) {
            if (this.$newLineMode === newLineMode)
            return;

            this.$newLineMode = newLineMode;
            this._signal("changeNewLineMode");
        };
        this.getNewLineMode = function() {
            return this.$newLineMode;
        };
        this.isNewLine = function(text) {
            return (text == "\r\n" || text == "\r" || text == "\n");
        };
        this.getLine = function(row) {
            return this.$lines[row] || "";
        };
        this.getLines = function(firstRow, lastRow) {
            return this.$lines.slice(firstRow, lastRow + 1);
        };
        this.getAllLines = function() {
            return this.getLines(0, this.getLength());
        };
        this.getLength = function() {
            return this.$lines.length;
        };
        this.getTextRange = function(range) {
            return this.getLinesForRange(range).join(this.getNewLineCharacter());
        };
        this.getLinesForRange = function(range) {
            var lines;
            if (range.start.row === range.end.row) {
                lines = [this.getLine(range.start.row).substring(range.start.column, range.end.column)];
            } else {
                lines = this.getLines(range.start.row, range.end.row);
                lines[0] = (lines[0] || "").substring(range.start.column);
                var l = lines.length - 1;
                if (range.end.row - range.start.row == l)
                lines[l] = lines[l].substring(0, range.end.column);
            }
            return lines;
        };
        this.insertLines = function(row, lines) {
            console.warn("Use of document.insertLines is deprecated. Use the insertFullLines method instead.");
            return this.insertFullLines(row, lines);
        };
        this.removeLines = function(firstRow, lastRow) {
            console.warn("Use of document.removeLines is deprecated. Use the removeFullLines method instead.");
            return this.removeFullLines(firstRow, lastRow);
        };
        this.insertNewLine = function(position) {
            console.warn("Use of document.insertNewLine is deprecated. Use insertMergedLines(position, ['', '']) instead.");
            return this.insertMergedLines(position, ["", ""]);
        };
        this.insert = function(position, text) {
            if (this.getLength() <= 1)
            this.$detectNewLine(text);

            return this.insertMergedLines(position, this.$split(text));
        };
        this.insertInLine = function(position, text) {
            var start = this.clippedPos(position.row, position.column);
            var end = this.pos(position.row, position.column + text.length);

            this.applyDelta({
                start: start,
                end: end,
                action: "insert",
                lines: [text]
            }, true);

            return this.clonePos(end);
        };

        this.clippedPos = function(row, column) {
            var length = this.getLength();
            if (row === undefined) {
                row = length;
            } else if (row < 0) {
                row = 0;
            } else if (row >= length) {
                row = length - 1;
                column = undefined;
            }
            var line = this.getLine(row);
            if (column == undefined)
            column = line.length;
            column = Math.min(Math.max(column, 0), line.length);
            return {row: row, column: column};
        };

        this.clonePos = function(pos) {
            return {row: pos.row, column: pos.column};
        };

        this.pos = function(row, column) {
            return {row: row, column: column};
        };

        this.$clipPosition = function(position) {
            var length = this.getLength();
            if (position.row >= length) {
                position.row = Math.max(0, length - 1);
                position.column = this.getLine(length - 1).length;
            } else {
                position.row = Math.max(0, position.row);
                position.column = Math.min(Math.max(position.column, 0), this.getLine(position.row).length);
            }
            return position;
        };
        this.insertFullLines = function(row, lines) {
            row = Math.min(Math.max(row, 0), this.getLength());
            var column = 0;
            if (row < this.getLength()) {
                lines = lines.concat([""]);
                column = 0;
            } else {
                lines = [""].concat(lines);
                row--;
                column = this.$lines[row].length;
            }
            this.insertMergedLines({row: row, column: column}, lines);
        };
        this.insertMergedLines = function(position, lines) {
            var start = this.clippedPos(position.row, position.column);
            var end = {
                row: start.row + lines.length - 1,
                column: (lines.length == 1 ? start.column : 0) + lines[lines.length - 1].length
            };

            this.applyDelta({
                start: start,
                end: end,
                action: "insert",
                lines: lines
            });

            return this.clonePos(end);
        };
        this.remove = function(range) {
            var start = this.clippedPos(range.start.row, range.start.column);
            var end = this.clippedPos(range.end.row, range.end.column);
            this.applyDelta({
                start: start,
                end: end,
                action: "remove",
                lines: this.getLinesForRange({start: start, end: end})
            });
            return this.clonePos(start);
        };
        this.removeInLine = function(row, startColumn, endColumn) {
            var start = this.clippedPos(row, startColumn);
            var end = this.clippedPos(row, endColumn);

            this.applyDelta({
                start: start,
                end: end,
                action: "remove",
                lines: this.getLinesForRange({start: start, end: end})
            }, true);

            return this.clonePos(start);
        };
        this.removeFullLines = function(firstRow, lastRow) {
            firstRow = Math.min(Math.max(0, firstRow), this.getLength() - 1);
            lastRow  = Math.min(Math.max(0, lastRow ), this.getLength() - 1);
            var deleteFirstNewLine = lastRow == this.getLength() - 1 && firstRow > 0;
            var deleteLastNewLine  = lastRow  < this.getLength() - 1;
            var startRow = ( deleteFirstNewLine ? firstRow - 1                  : firstRow                    );
            var startCol = ( deleteFirstNewLine ? this.getLine(startRow).length : 0                           );
            var endRow   = ( deleteLastNewLine  ? lastRow + 1                   : lastRow                     );
            var endCol   = ( deleteLastNewLine  ? 0                             : this.getLine(endRow).length );
            var range = new Range(startRow, startCol, endRow, endCol);
            var deletedLines = this.$lines.slice(firstRow, lastRow + 1);

            this.applyDelta({
                start: range.start,
                end: range.end,
                action: "remove",
                lines: this.getLinesForRange(range)
            });
            return deletedLines;
        };
        this.removeNewLine = function(row) {
            if (row < this.getLength() - 1 && row >= 0) {
                this.applyDelta({
                    start: this.pos(row, this.getLine(row).length),
                    end: this.pos(row + 1, 0),
                    action: "remove",
                    lines: ["", ""]
                });
            }
        };
        this.replace = function(range, text) {
            if (!(range instanceof Range))
            range = Range.fromPoints(range.start, range.end);
            if (text.length === 0 && range.isEmpty())
            return range.start;
            if (text == this.getTextRange(range))
            return range.end;

            this.remove(range);
            var end;
            if (text) {
                end = this.insert(range.start, text);
            }
            else {
                end = range.start;
            }

            return end;
        };
        this.applyDeltas = function(deltas) {
            for (var i=0; i<deltas.length; i++) {
                this.applyDelta(deltas[i]);
            }
        };
        this.revertDeltas = function(deltas) {
            for (var i=deltas.length-1; i>=0; i--) {
                this.revertDelta(deltas[i]);
            }
        };
        this.applyDelta = function(delta, doNotValidate) {
            var isInsert = delta.action == "insert";
            if (isInsert ? delta.lines.length <= 1 && !delta.lines[0]
                : !Range.comparePoints(delta.start, delta.end)) {
                    return;
                }

                if (isInsert && delta.lines.length > 20000)
                this.$splitAndapplyLargeDelta(delta, 20000);
                applyDelta(this.$lines, delta, doNotValidate);
                this._signal("change", delta);
            };

            this.$splitAndapplyLargeDelta = function(delta, MAX) {
                var lines = delta.lines;
                var l = lines.length;
                var row = delta.start.row;
                var column = delta.start.column;
                var from = 0, to = 0;
                do {
                    from = to;
                    to += MAX - 1;
                    var chunk = lines.slice(from, to);
                    if (to > l) {
                        delta.lines = chunk;
                        delta.start.row = row + from;
                        delta.start.column = column;
                        break;
                    }
                    chunk.push("");
                    this.applyDelta({
                        start: this.pos(row + from, column),
                        end: this.pos(row + to, column = 0),
                        action: delta.action,
                        lines: chunk
                    }, true);
                } while(true);
            };
            this.revertDelta = function(delta) {
                this.applyDelta({
                    start: this.clonePos(delta.start),
                    end: this.clonePos(delta.end),
                    action: (delta.action == "insert" ? "remove" : "insert"),
                    lines: delta.lines.slice()
                });
            };
            this.indexToPosition = function(index, startRow) {
                var lines = this.$lines || this.getAllLines();
                var newlineLength = this.getNewLineCharacter().length;
                for (var i = startRow || 0, l = lines.length; i < l; i++) {
                    index -= lines[i].length + newlineLength;
                    if (index < 0)
                    return {row: i, column: index + lines[i].length + newlineLength};
                }
                return {row: l-1, column: lines[l-1].length};
            };
            this.positionToIndex = function(pos, startRow) {
                var lines = this.$lines || this.getAllLines();
                var newlineLength = this.getNewLineCharacter().length;
                var index = 0;
                var row = Math.min(pos.row, lines.length);
                for (var i = startRow || 0; i < row; ++i)
                index += lines[i].length + newlineLength;

                return index + pos.column;
            };

        }).call(Document.prototype);

        exports.Document = Document;
    });

    define("ace/lib/lang",["require","exports","module"], function(require, exports, module) {
        "use strict";

        exports.last = function(a) {
            return a[a.length - 1];
        };

        exports.stringReverse = function(string) {
            return string.split("").reverse().join("");
        };

        exports.stringRepeat = function (string, count) {
            var result = '';
            while (count > 0) {
                if (count & 1)
                result += string;

                if (count >>= 1)
                string += string;
            }
            return result;
        };

        var trimBeginRegexp = /^\s\s*/;
        var trimEndRegexp = /\s\s*$/;

        exports.stringTrimLeft = function (string) {
            return string.replace(trimBeginRegexp, '');
        };

        exports.stringTrimRight = function (string) {
            return string.replace(trimEndRegexp, '');
        };

        exports.copyObject = function(obj) {
            var copy = {};
            for (var key in obj) {
                copy[key] = obj[key];
            }
            return copy;
        };

        exports.copyArray = function(array){
            var copy = [];
            for (var i=0, l=array.length; i<l; i++) {
                if (array[i] && typeof array[i] == "object")
                copy[i] = this.copyObject(array[i]);
                else
                copy[i] = array[i];
            }
            return copy;
        };

        exports.deepCopy = function deepCopy(obj) {
            if (typeof obj !== "object" || !obj)
            return obj;
            var copy;
            if (Array.isArray(obj)) {
                copy = [];
                for (var key = 0; key < obj.length; key++) {
                    copy[key] = deepCopy(obj[key]);
                }
                return copy;
            }
            if (Object.prototype.toString.call(obj) !== "[object Object]")
            return obj;

            copy = {};
            for (var key in obj)
            copy[key] = deepCopy(obj[key]);
            return copy;
        };

        exports.arrayToMap = function(arr) {
            var map = {};
            for (var i=0; i<arr.length; i++) {
                map[arr[i]] = 1;
            }
            return map;

        };

        exports.createMap = function(props) {
            var map = Object.create(null);
            for (var i in props) {
                map[i] = props[i];
            }
            return map;
        };
        exports.arrayRemove = function(array, value) {
            for (var i = 0; i <= array.length; i++) {
                if (value === array[i]) {
                    array.splice(i, 1);
                }
            }
        };

        exports.escapeRegExp = function(str) {
            return str.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
        };

        exports.escapeHTML = function(str) {
            return str.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
        };

        exports.getMatchOffsets = function(string, regExp) {
            var matches = [];

            string.replace(regExp, function(str) {
                matches.push({
                    offset: arguments[arguments.length-2],
                    length: str.length
                });
            });

            return matches;
        };
        exports.deferredCall = function(fcn) {
            var timer = null;
            var callback = function() {
                timer = null;
                fcn();
            };

            var deferred = function(timeout) {
                deferred.cancel();
                timer = setTimeout(callback, timeout || 0);
                return deferred;
            };

            deferred.schedule = deferred;

            deferred.call = function() {
                this.cancel();
                fcn();
                return deferred;
            };

            deferred.cancel = function() {
                clearTimeout(timer);
                timer = null;
                return deferred;
            };

            deferred.isPending = function() {
                return timer;
            };

            return deferred;
        };


        exports.delayedCall = function(fcn, defaultTimeout) {
            var timer = null;
            var callback = function() {
                timer = null;
                fcn();
            };

            var _self = function(timeout) {
                if (timer == null)
                timer = setTimeout(callback, timeout || defaultTimeout);
            };

            _self.delay = function(timeout) {
                timer && clearTimeout(timer);
                timer = setTimeout(callback, timeout || defaultTimeout);
            };
            _self.schedule = _self;

            _self.call = function() {
                this.cancel();
                fcn();
            };

            _self.cancel = function() {
                timer && clearTimeout(timer);
                timer = null;
            };

            _self.isPending = function() {
                return timer;
            };

            return _self;
        };
    });

    define("ace/worker/mirror",["require","exports","module","ace/range","ace/document","ace/lib/lang"], function(require, exports, module) {
        "use strict";

        var Range = require("../range").Range;
        var Document = require("../document").Document;
        var lang = require("../lib/lang");

        var Mirror = exports.Mirror = function(sender) {
            this.sender = sender;
            var doc = this.doc = new Document("");

            var deferredUpdate = this.deferredUpdate = lang.delayedCall(this.onUpdate.bind(this));

            var _self = this;
            sender.on("change", function(e) {
                var data = e.data;
                if (data[0].start) {
                    doc.applyDeltas(data);
                } else {
                    for (var i = 0; i < data.length; i += 2) {
                        if (Array.isArray(data[i+1])) {
                            var d = {action: "insert", start: data[i], lines: data[i+1]};
                        } else {
                            var d = {action: "remove", start: data[i], end: data[i+1]};
                        }
                        doc.applyDelta(d, true);
                    }
                }
                if (_self.$timeout)
                return deferredUpdate.schedule(_self.$timeout);
                _self.onUpdate();
            });
        };

        (function() {

            this.$timeout = 500;

            this.setTimeout = function(timeout) {
                this.$timeout = timeout;
            };

            this.setValue = function(value) {
                this.doc.setValue(value);
                this.deferredUpdate.schedule(this.$timeout);
            };

            this.getValue = function(callbackId) {
                this.sender.callback(this.doc.getValue(), callbackId);
            };

            this.onUpdate = function() {
            };

            this.isPending = function() {
                return this.deferredUpdate.isPending();
            };

        }).call(Mirror.prototype);

    });

    define("ace/lib/es5-shim",["require","exports","module"], function(require, exports, module) {

        function Empty() {}

        if (!Function.prototype.bind) {
            Function.prototype.bind = function bind(that) { // .length is 1
                var target = this;
                if (typeof target != "function") {
                    throw new TypeError("Function.prototype.bind called on incompatible " + target);
                }
                var args = slice.call(arguments, 1); // for normal call
                var bound = function () {

                    if (this instanceof bound) {

                        var result = target.apply(
                            this,
                            args.concat(slice.call(arguments))
                        );
                        if (Object(result) === result) {
                            return result;
                        }
                        return this;

                    } else {
                        return target.apply(
                            that,
                            args.concat(slice.call(arguments))
                        );

                    }

                };
                if(target.prototype) {
                    Empty.prototype = target.prototype;
                    bound.prototype = new Empty();
                    Empty.prototype = null;
                }
                return bound;
            };
        }
        var call = Function.prototype.call;
        var prototypeOfArray = Array.prototype;
        var prototypeOfObject = Object.prototype;
        var slice = prototypeOfArray.slice;
        var _toString = call.bind(prototypeOfObject.toString);
        var owns = call.bind(prototypeOfObject.hasOwnProperty);
        var defineGetter;
        var defineSetter;
        var lookupGetter;
        var lookupSetter;
        var supportsAccessors;
        if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
            defineGetter = call.bind(prototypeOfObject.__defineGetter__);
            defineSetter = call.bind(prototypeOfObject.__defineSetter__);
            lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
            lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
        }
        if ([1,2].splice(0).length != 2) {
            if(function() { // test IE < 9 to splice bug - see issue #138
                function makeArray(l) {
                    var a = new Array(l+2);
                    a[0] = a[1] = 0;
                    return a;
                }
                var array = [], lengthBefore;

                array.splice.apply(array, makeArray(20));
                array.splice.apply(array, makeArray(26));

                lengthBefore = array.length; //46
                array.splice(5, 0, "XXX"); // add one element

                lengthBefore + 1 == array.length

                if (lengthBefore + 1 == array.length) {
                    return true;// has right splice implementation without bugs
                }
            }()) {//IE 6/7
                var array_splice = Array.prototype.splice;
                Array.prototype.splice = function(start, deleteCount) {
                    if (!arguments.length) {
                        return [];
                    } else {
                        return array_splice.apply(this, [
                            start === void 0 ? 0 : start,
                            deleteCount === void 0 ? (this.length - start) : deleteCount
                        ].concat(slice.call(arguments, 2)))
                    }
                };
            } else {//IE8
                Array.prototype.splice = function(pos, removeCount){
                    var length = this.length;
                    if (pos > 0) {
                        if (pos > length)
                        pos = length;
                    } else if (pos == void 0) {
                        pos = 0;
                    } else if (pos < 0) {
                        pos = Math.max(length + pos, 0);
                    }

                    if (!(pos+removeCount < length))
                    removeCount = length - pos;

                    var removed = this.slice(pos, pos+removeCount);
                    var insert = slice.call(arguments, 2);
                    var add = insert.length;
                    if (pos === length) {
                        if (add) {
                            this.push.apply(this, insert);
                        }
                    } else {
                        var remove = Math.min(removeCount, length - pos);
                        var tailOldPos = pos + remove;
                        var tailNewPos = tailOldPos + add - remove;
                        var tailCount = length - tailOldPos;
                        var lengthAfterRemove = length - remove;

                        if (tailNewPos < tailOldPos) { // case A
                            for (var i = 0; i < tailCount; ++i) {
                                this[tailNewPos+i] = this[tailOldPos+i];
                            }
                        } else if (tailNewPos > tailOldPos) { // case B
                            for (i = tailCount; i--; ) {
                                this[tailNewPos+i] = this[tailOldPos+i];
                            }
                        } // else, add == remove (nothing to do)

                        if (add && pos === lengthAfterRemove) {
                            this.length = lengthAfterRemove; // truncate array
                            this.push.apply(this, insert);
                        } else {
                            this.length = lengthAfterRemove + add; // reserves space
                            for (i = 0; i < add; ++i) {
                                this[pos+i] = insert[i];
                            }
                        }
                    }
                    return removed;
                };
            }
        }
        if (!Array.isArray) {
            Array.isArray = function isArray(obj) {
                return _toString(obj) == "[object Array]";
            };
        }
        var boxedString = Object("a"),
        splitString = boxedString[0] != "a" || !(0 in boxedString);

        if (!Array.prototype.forEach) {
            Array.prototype.forEach = function forEach(fun /*, thisp*/) {
                var object = toObject(this),
                self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
                thisp = arguments[1],
                i = -1,
                length = self.length >>> 0;
                if (_toString(fun) != "[object Function]") {
                    throw new TypeError(); // TODO message
                }

                while (++i < length) {
                    if (i in self) {
                        fun.call(thisp, self[i], i, object);
                    }
                }
            };
        }
        if (!Array.prototype.map) {
            Array.prototype.map = function map(fun /*, thisp*/) {
                var object = toObject(this),
                self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
                length = self.length >>> 0,
                result = Array(length),
                thisp = arguments[1];
                if (_toString(fun) != "[object Function]") {
                    throw new TypeError(fun + " is not a function");
                }

                for (var i = 0; i < length; i++) {
                    if (i in self)
                    result[i] = fun.call(thisp, self[i], i, object);
                }
                return result;
            };
        }
        if (!Array.prototype.filter) {
            Array.prototype.filter = function filter(fun /*, thisp */) {
                var object = toObject(this),
                self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
                length = self.length >>> 0,
                result = [],
                value,
                thisp = arguments[1];
                if (_toString(fun) != "[object Function]") {
                    throw new TypeError(fun + " is not a function");
                }

                for (var i = 0; i < length; i++) {
                    if (i in self) {
                        value = self[i];
                        if (fun.call(thisp, value, i, object)) {
                            result.push(value);
                        }
                    }
                }
                return result;
            };
        }
        if (!Array.prototype.every) {
            Array.prototype.every = function every(fun /*, thisp */) {
                var object = toObject(this),
                self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
                length = self.length >>> 0,
                thisp = arguments[1];
                if (_toString(fun) != "[object Function]") {
                    throw new TypeError(fun + " is not a function");
                }

                for (var i = 0; i < length; i++) {
                    if (i in self && !fun.call(thisp, self[i], i, object)) {
                        return false;
                    }
                }
                return true;
            };
        }
        if (!Array.prototype.some) {
            Array.prototype.some = function some(fun /*, thisp */) {
                var object = toObject(this),
                self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
                length = self.length >>> 0,
                thisp = arguments[1];
                if (_toString(fun) != "[object Function]") {
                    throw new TypeError(fun + " is not a function");
                }

                for (var i = 0; i < length; i++) {
                    if (i in self && fun.call(thisp, self[i], i, object)) {
                        return true;
                    }
                }
                return false;
            };
        }
        if (!Array.prototype.reduce) {
            Array.prototype.reduce = function reduce(fun /*, initial*/) {
                var object = toObject(this),
                self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
                length = self.length >>> 0;
                if (_toString(fun) != "[object Function]") {
                    throw new TypeError(fun + " is not a function");
                }
                if (!length && arguments.length == 1) {
                    throw new TypeError("reduce of empty array with no initial value");
                }

                var i = 0;
                var result;
                if (arguments.length >= 2) {
                    result = arguments[1];
                } else {
                    do {
                        if (i in self) {
                            result = self[i++];
                            break;
                        }
                        if (++i >= length) {
                            throw new TypeError("reduce of empty array with no initial value");
                        }
                    } while (true);
                }

                for (; i < length; i++) {
                    if (i in self) {
                        result = fun.call(void 0, result, self[i], i, object);
                    }
                }

                return result;
            };
        }
        if (!Array.prototype.reduceRight) {
            Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
                var object = toObject(this),
                self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
                length = self.length >>> 0;
                if (_toString(fun) != "[object Function]") {
                    throw new TypeError(fun + " is not a function");
                }
                if (!length && arguments.length == 1) {
                    throw new TypeError("reduceRight of empty array with no initial value");
                }

                var result, i = length - 1;
                if (arguments.length >= 2) {
                    result = arguments[1];
                } else {
                    do {
                        if (i in self) {
                            result = self[i--];
                            break;
                        }
                        if (--i < 0) {
                            throw new TypeError("reduceRight of empty array with no initial value");
                        }
                    } while (true);
                }

                do {
                    if (i in this) {
                        result = fun.call(void 0, result, self[i], i, object);
                    }
                } while (i--);

                return result;
            };
        }
        if (!Array.prototype.indexOf || ([0, 1].indexOf(1, 2) != -1)) {
            Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
                var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
                length = self.length >>> 0;

                if (!length) {
                    return -1;
                }

                var i = 0;
                if (arguments.length > 1) {
                    i = toInteger(arguments[1]);
                }
                i = i >= 0 ? i : Math.max(0, length + i);
                for (; i < length; i++) {
                    if (i in self && self[i] === sought) {
                        return i;
                    }
                }
                return -1;
            };
        }
        if (!Array.prototype.lastIndexOf || ([0, 1].lastIndexOf(0, -3) != -1)) {
            Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
                var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
                length = self.length >>> 0;

                if (!length) {
                    return -1;
                }
                var i = length - 1;
                if (arguments.length > 1) {
                    i = Math.min(i, toInteger(arguments[1]));
                }
                i = i >= 0 ? i : length - Math.abs(i);
                for (; i >= 0; i--) {
                    if (i in self && sought === self[i]) {
                        return i;
                    }
                }
                return -1;
            };
        }
        if (!Object.getPrototypeOf) {
            Object.getPrototypeOf = function getPrototypeOf(object) {
                return object.__proto__ || (
                    object.constructor ?
                    object.constructor.prototype :
                    prototypeOfObject
                );
            };
        }
        if (!Object.getOwnPropertyDescriptor) {
            var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a " +
            "non-object: ";
            Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
                if ((typeof object != "object" && typeof object != "function") || object === null)
                throw new TypeError(ERR_NON_OBJECT + object);
                if (!owns(object, property))
                return;

                var descriptor, getter, setter;
                descriptor =  { enumerable: true, configurable: true };
                if (supportsAccessors) {
                    var prototype = object.__proto__;
                    object.__proto__ = prototypeOfObject;

                    var getter = lookupGetter(object, property);
                    var setter = lookupSetter(object, property);
                    object.__proto__ = prototype;

                    if (getter || setter) {
                        if (getter) descriptor.get = getter;
                        if (setter) descriptor.set = setter;
                        return descriptor;
                    }
                }
                descriptor.value = object[property];
                return descriptor;
            };
        }
        if (!Object.getOwnPropertyNames) {
            Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
                return Object.keys(object);
            };
        }
        if (!Object.create) {
            var createEmpty;
            if (Object.prototype.__proto__ === null) {
                createEmpty = function () {
                    return { "__proto__": null };
                };
            } else {
                createEmpty = function () {
                    var empty = {};
                    for (var i in empty)
                    empty[i] = null;
                    empty.constructor =
                    empty.hasOwnProperty =
                    empty.propertyIsEnumerable =
                    empty.isPrototypeOf =
                    empty.toLocaleString =
                    empty.toString =
                    empty.valueOf =
                    empty.__proto__ = null;
                    return empty;
                }
            }

            Object.create = function create(prototype, properties) {
                var object;
                if (prototype === null) {
                    object = createEmpty();
                } else {
                    if (typeof prototype != "object")
                    throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
                    var Type = function () {};
                    Type.prototype = prototype;
                    object = new Type();
                    object.__proto__ = prototype;
                }
                if (properties !== void 0)
                Object.defineProperties(object, properties);
                return object;
            };
        }

        function doesDefinePropertyWork(object) {
            try {
                Object.defineProperty(object, "sentinel", {});
                return "sentinel" in object;
            } catch (exception) {
            }
        }
        if (Object.defineProperty) {
            var definePropertyWorksOnObject = doesDefinePropertyWork({});
            var definePropertyWorksOnDom = typeof document == "undefined" ||
            doesDefinePropertyWork(document.createElement("div"));
            if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
                var definePropertyFallback = Object.defineProperty;
            }
        }

        if (!Object.defineProperty || definePropertyFallback) {
            var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
            var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
            var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
            "on this javascript engine";

            Object.defineProperty = function defineProperty(object, property, descriptor) {
                if ((typeof object != "object" && typeof object != "function") || object === null)
                throw new TypeError(ERR_NON_OBJECT_TARGET + object);
                if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null)
                throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
                if (definePropertyFallback) {
                    try {
                        return definePropertyFallback.call(Object, object, property, descriptor);
                    } catch (exception) {
                    }
                }
                if (owns(descriptor, "value")) {

                    if (supportsAccessors && (lookupGetter(object, property) ||
                    lookupSetter(object, property)))
                    {
                        var prototype = object.__proto__;
                        object.__proto__ = prototypeOfObject;
                        delete object[property];
                        object[property] = descriptor.value;
                        object.__proto__ = prototype;
                    } else {
                        object[property] = descriptor.value;
                    }
                } else {
                    if (!supportsAccessors)
                    throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
                    if (owns(descriptor, "get"))
                    defineGetter(object, property, descriptor.get);
                    if (owns(descriptor, "set"))
                    defineSetter(object, property, descriptor.set);
                }

                return object;
            };
        }
        if (!Object.defineProperties) {
            Object.defineProperties = function defineProperties(object, properties) {
                for (var property in properties) {
                    if (owns(properties, property))
                    Object.defineProperty(object, property, properties[property]);
                }
                return object;
            };
        }
        if (!Object.seal) {
            Object.seal = function seal(object) {
                return object;
            };
        }
        if (!Object.freeze) {
            Object.freeze = function freeze(object) {
                return object;
            };
        }
        try {
            Object.freeze(function () {});
        } catch (exception) {
            Object.freeze = (function freeze(freezeObject) {
                return function freeze(object) {
                    if (typeof object == "function") {
                        return object;
                    } else {
                        return freezeObject(object);
                    }
                };
            })(Object.freeze);
        }
        if (!Object.preventExtensions) {
            Object.preventExtensions = function preventExtensions(object) {
                return object;
            };
        }
        if (!Object.isSealed) {
            Object.isSealed = function isSealed(object) {
                return false;
            };
        }
        if (!Object.isFrozen) {
            Object.isFrozen = function isFrozen(object) {
                return false;
            };
        }
        if (!Object.isExtensible) {
            Object.isExtensible = function isExtensible(object) {
                if (Object(object) === object) {
                    throw new TypeError(); // TODO message
                }
                var name = '';
                while (owns(object, name)) {
                    name += '?';
                }
                object[name] = true;
                var returnValue = owns(object, name);
                delete object[name];
                return returnValue;
            };
        }
        if (!Object.keys) {
            var hasDontEnumBug = true,
            dontEnums = [
                "toString",
                "toLocaleString",
                "valueOf",
                "hasOwnProperty",
                "isPrototypeOf",
                "propertyIsEnumerable",
                "constructor"
            ],
            dontEnumsLength = dontEnums.length;

            for (var key in {"toString": null}) {
                hasDontEnumBug = false;
            }

            Object.keys = function keys(object) {

                if (
                    (typeof object != "object" && typeof object != "function") ||
                    object === null
                ) {
                    throw new TypeError("Object.keys called on a non-object");
                }

                var keys = [];
                for (var name in object) {
                    if (owns(object, name)) {
                        keys.push(name);
                    }
                }

                if (hasDontEnumBug) {
                    for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                        var dontEnum = dontEnums[i];
                        if (owns(object, dontEnum)) {
                            keys.push(dontEnum);
                        }
                    }
                }
                return keys;
            };

        }
        if (!Date.now) {
            Date.now = function now() {
                return new Date().getTime();
            };
        }
        var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
        "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
        "\u2029\uFEFF";
        if (!String.prototype.trim || ws.trim()) {
            ws = "[" + ws + "]";
            var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
            trimEndRegexp = new RegExp(ws + ws + "*$");
            String.prototype.trim = function trim() {
                return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
            };
        }

        function toInteger(n) {
            n = +n;
            if (n !== n) { // isNaN
                n = 0;
            } else if (n !== 0 && n !== (1/0) && n !== -(1/0)) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
            return n;
        }

        function isPrimitive(input) {
            var type = typeof input;
            return (
                input === null ||
                type === "undefined" ||
                type === "boolean" ||
                type === "number" ||
                type === "string"
            );
        }

        function toPrimitive(input) {
            var val, valueOf, toString;
            if (isPrimitive(input)) {
                return input;
            }
            valueOf = input.valueOf;
            if (typeof valueOf === "function") {
                val = valueOf.call(input);
                if (isPrimitive(val)) {
                    return val;
                }
            }
            toString = input.toString;
            if (typeof toString === "function") {
                val = toString.call(input);
                if (isPrimitive(val)) {
                    return val;
                }
            }
            throw new TypeError();
        }
        var toObject = function (o) {
            if (o == null) { // this matches both null and undefined
                throw new TypeError("can't convert "+o+" to object");
            }
            return Object(o);
        };

    });
    define("ace/mode/jsonata_worker",["require","exports","ace/lib/oop","ace/worker/mirror"], function(require, exports) {
        var oop = require("../lib/oop");
        var Mirror = require("../worker/mirror").Mirror;

        var JSONataWorker = exports.JSONataWorker = function(sender) {
            Mirror.call(this, sender);
            this.setTimeout(200);
        };

        oop.inherits(JSONataWorker, Mirror);

        (function() {

            this.onUpdate = function() {
                var value = this.doc.getValue();
                var errors = [];
                try {
                    if (value) {
                        jsonata(value);
                    }
                } catch (e) {
                    var pos = this.doc.indexToPosition(e.position-1);
                    var msg = e.message;
                    msg = msg.replace(/ at column \d+/,"");
                    errors.push({
                        row: pos.row,
                        column: pos.column,
                        text: msg,
                        type: "error"
                    });
                }
                this.sender.emit("annotate", errors);
            };

        }).call(JSONataWorker.prototype);

    });
