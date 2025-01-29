# Disclaimer
>⚠️ THIS VERSION IS A FORK OF A FORK ⚠️
>
>[Original project](https://github.com/oscmejia/os-utils/pulls "os-utils") by [Oscar Mejia](https://github.com/oscmejia "oscmejia")
>
>Based on [Arthur Cnops](https://github.com/accnops "accnops")'s [fork](https://github.com/accnops/os-utils "os-utils fork")
>
>_see pull [request #11](https://github.com/oscmejia/os-utils/pull/11)_

# os-utils
An operating system utility library. Some methods are wrappers of node libraries
and others are calculations made by the module.

Then in your code 
```js
var os 	= require('./osutils');

let cpu_usage = await os.cpuUsage();
console.log( 'CPU Usage (%) : ' + cpu_usage );

let cpu_free = await os.cpuFree();
console.log( 'CPU Free : ' + cpu_free );
```


# Documentation

## .cpuCount()
>### Get number of CPUs
>Return [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
>
>Example :
>```js
>let cpu_count = os.cpuCount();
>console.log(cpu_count);
>```
>&#x200b;

## .cpuUsage()
>### Calculate CPU usage for the next second
>Return : [Promise](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Promise) [\<Number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
>
>Examples :
>```js
>let cpu_usage = await os.cpuUsage();
>console.log( 'CPU Usage (%) : ' + cpu_usage );
>```
>&#x200b;

## .cpuFree()
>### Calculate free CPU for the next second
>This is not based on average CPU usage like it is in the "os" module. The callback will receive a parameter with the value.
>
>Return : [Promise](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Promise) [\<Number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
>
>Examples :
>```js
>let cpu_free = await os.cpuFree();
>console.log( 'CPU Free : ' + cpu_free );
>```
>&#x200b;

## .platform()	
>### Get the platform name
>Return [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
>
>Possible values : `aix`, `darwin`, `freebsd`, `linux`, `openbsd`, `sunos`, `win32`
>
>Example :
>```js
>let platform = os.platform();
>console.log(platform);
>```
>&#x200b;

## .freemem(options)
>### Get current free memory
>| PARAMETER | TYPE | OPTIONAL | DEFAULT | DESCRIPTION |
>|:-:|:-:|:-:|:-:|:-:|
>| format | [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) | ✅ | `auto` | Define the output format.
>| round | [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) | ✅ | 5 | The count of number after de comma.
>
>Return [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
>```js
>{
>  value: Number,
>  raw: Number,
>  format: String
>}
>```
>
> Example :
>```js
>let free_mem = os.freemem({ format: 'auto', round: 2 });
>console.log(`Free Memory : ${free_mem.value + free_mem.format}`);
>```
>&#x200b;

## .usedmem(options)
>### Get current used memory
>| PARAMETER | TYPE | OPTIONAL | DEFAULT | DESCRIPTION |
>|:-:|:-:|:-:|:-:|:-:|
>| format | [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) | ✅ | `auto` | Define the output format.
>| round | [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) | ✅ | 5 | The count of number after de comma.
>
>Return [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
>```js
>{
>  value: Number,
>  raw: Number,
>  format: String
>}
>```
>
> Example :
>```js
>let used_mem = os.usedmem({ format: 'auto', round: 2 });
>console.log(`Used Memory : ${used_mem.value + used_mem.format}`);
>```
>&#x200b;

## .totalmem(options)
>### Get current total memory
>| PARAMETER | TYPE | OPTIONAL | DEFAULT | DESCRIPTION |
>|:-:|:-:|:-:|:-:|:-:|
>| format | [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) | ✅ | `auto` | Define the output format.
>| round | [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) | ✅ | 5 | The count of number after de comma.
>
>Return [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
>```js
>{
>  value: Number,
>  raw: Number,
>  format: String
>}
>```
>
> Example :
>```js
>let total_mem = os.totalmem({ format: 'auto', round: 2 });
>console.log(`Used Memory : ${total_mem.value + total_mem.format}`);
>```
>&#x200b;


## .freememPercentage()
>### Get a current free memory percentage _(value between 0 and 1)_
>Return [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
>
>Example :
>```js
>let free_mem_percent = os.freememPercentage();
>console.log(free_mem_percent);
>```
>&#x200b;

## .sysUptime()
>### Get the number of seconds the system has been running for
>Return [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
>
>Example :
>```js
>let uptime = os.sysUptime();
>console.log(`The system is running since ${uptime} seconds.`);
>```
>&#x200b;

## .processUptime()
### Get the number of seconds the process has been running for
>Return [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
>
>Example :
>```js
>let uptime = os.processUptime();
>console.log(`The process is running since ${uptime} seconds.`);
>```
>	
>	
>### Get the number of seconds the process has been running
>```js
>os.processUptime() 
>```
>&#x200b;


## .loadavg(time)
>### Get average load for 1, 5 or 15 minutes
>Return [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
>
>| PARAMETER | TYPE | OPTIONAL | DEFAULT | DESCRIPTION |
>|:-:|:-:|:-:|:-:|:-:|
>| time | [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) | ✅ | 1 | Average Load for last N minutes |
>
>\*Possible value : 1, 5, 15
>
>Exemple :
>```js
>let loadavg_1  = os.loadavg(1);
>let loadavg_5  = os.loadavg(5);
>let loadavg_15 = os.loadavg(15);
>
>console.log(loadavg_1, loadavg_5, loadavg_15);
>```
>&#x200b;

## Not documented yet :
* freeCommand()
* harddrive()
* getProcesses()