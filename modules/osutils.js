// /-------------------------------------------------------------------\
// | Original project by Oscar Mejia (https://github.com/oscmejia)     |
// | Fork by Arthur Cnops (https://github.com/accnops)                 |
// |  From Pull request #11                                            |
// |  => https://github.com/oscmejia/os-utils/pull/11                  |
// \-------------------------------------------------------------------/

import os from 'os';
import childProcess from 'child_process';

export const platform = () => process.platform;

export const cpuCount = () => os.cpus().length;

export const sysUptime = () => os.uptime();

export const processUptime = () => process.uptime();

function formatMem(value, { format, round: roundLevel } = {}) {
  let formats = ['b', 'kb', 'mb', 'gb', 'tb'];
  let formatIndex = 0;
  let round = 10 ** (roundLevel || 5);

  if (!format || ['auto', 'automatique'].includes(format.toLowerCase())) {
    while ((value / (1024 ** formatIndex)) > 1000 && formatIndex < formats.length - 1) formatIndex += 1;
  } else {
    formatIndex = formats.findIndex(f => f === format.toLowerCase());
    if (formatIndex < 0) formatIndex = 0;
  }

  return {
    value: Math.round(value / (1024 ** formatIndex) * round) / round,
    raw: value / (1024 ** formatIndex),
    format: formats[formatIndex],
  };
}

export const freemem = (options) => formatMem(os.freemem(), options);

export const usedmem = (options) => formatMem(os.totalmem() - os.freemem(), options);

export const totalmem = (options) => formatMem(os.totalmem(), options);

export const freememPercentage = () => os.freemem() / os.totalmem();

export const freeCommand = () => new Promise((resolve, reject) => {
  childProcess.exec('free -m', (error, stdout) => {
    if (error) return reject(error);
    const lines = stdout.split('\n');
    const strMemInfo = lines[1].replace(/[\s\n\r]+/g, ' ');
    const memInfo = strMemInfo.split(' ');
    const totalMem = parseFloat(memInfo[1]);
    const freeMem = parseFloat(memInfo[3]);
    const buffersMem = parseFloat(memInfo[5]);
    const cachedMem = parseFloat(memInfo[6]);
    const usedMem = totalMem - (freeMem + buffersMem + cachedMem);
    resolve(usedMem, cachedMem);
  });
});

export const harddrive = () => new Promise((resolve, reject) => {
  childProcess.exec('df -k', (error, stdout) => {
    if (error) return reject(error);
    const lines = stdout.split('\n');
    const strDiskInfo = lines[1].replace(/[\s\n\r]+/g, ' ');
    const diskInfo = strDiskInfo.split(' ');
    const total = Math.ceil((diskInfo[1] * 1024) / (1024 ** 2));
    const used = Math.ceil((diskInfo[2] * 1024) / (1024 ** 2));
    const free = Math.ceil((diskInfo[3] * 1024) / (1024 ** 2));
    resolve({ total, free, used });
  });
});

export const getProcesses = nProcess => new Promise((resolve, reject) => {
  const nP = nProcess || 0;
  let command = `ps -eo pcpu,pmem,time,args | sort -k 1 -r | head -n${10}`;
  if (nP > 0) command = `ps -eo pcpu,pmem,time,args | sort -k 1 -r | head -n${nP + 1}`;

  childProcess.exec(command, (error, stdout) => {
    if (error) return reject(error);
    const lines = stdout.split('\n');
    lines.shift();
    lines.pop();
    let result = '';
    lines.forEach((item) => {
      let str = item.replace(/[\s\n\r]+/g, ' ');
      str = str.split(' ');
      result += `${str[1]} ${str[2]} ${str[3]} ${str[4].substring((str[4].length - 25))}\n`;
    });
    resolve(result);
  });
});

export const loadavg = (time) => {
  const loads = os.loadavg();
  let index = Math.floor(15 / time);
  return loads[index] !== undefined ? loads[index] : loads[0];
};

function getCPUInfo() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  Object.values(cpus).forEach((cpu) => {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    irq += cpu.times.irq;
    idle += cpu.times.idle;
  });
  const total = user + nice + sys + idle + irq;
  return { idle, total };
}

function getCPUUsage(free) {
  return new Promise((resolve) => {
    const stats1 = getCPUInfo();
    const startIdle = stats1.idle;
    const startTotal = stats1.total;
    setTimeout(() => {
      const stats2 = getCPUInfo();
      const endIdle = stats2.idle;
      const endTotal = stats2.total;
      const idle = endIdle - startIdle;
      const total = endTotal - startTotal;
      const perc = idle / total;
      resolve(free === true ? perc : 1 - perc);
    }, 1000);
  });
}

export const cpuFree = () => getCPUUsage(true);

export const cpuUsage = () => getCPUUsage(false);

export default {
  platform,
  cpuCount,
  sysUptime,
  processUptime,
  freemem,
  usedmem,
  totalmem,
  freememPercentage,
  freeCommand,
  harddrive,
  getProcesses,
  loadavg,
  cpuFree,
  cpuUsage
};