import { Registry } from '#modules/Registry';
// MARK: Register Module
Registry.register({
  name: "Math Utils",
  group: "utils",
  version: "2.0",
  details: [
    "Math.clamp",
    "Math.between",
    "Math.calculate",
  ]
});

// ===================================================================================================
//   __  __   _ _____ _  _
//  |  \/  | /_\_   _| || |
//  | |\/| |/ _ \| | | __ |
//  |_|  |_/_/ \_\_| |_||_|
// ===================================================================================================
Math.clamp = function (v, min, max) {
  return Math.max(min ?? v, Math.min(v, max ?? v));
};

Math.between = function (min, current, max) {
  return Math.max(min, Math.min(current, max));
};

Math.calculate = function (rawcalc) {
  if (typeof rawcalc !== 'string') return null;

  while (rawcalc.match(/\(([^\(\)]*)\)/g)) {
    Array.from(new Set(rawcalc.match(/\(([^\(\)]*)\)/g))).forEach((m) => {
      rawcalc = rawcalc.replace(m, calculate(m.slice(1, -1)));
    });
  }

  // --- Parse a calculation string into an array of numbers and operators
  var calculation = [],
    current = '';
  for (var i = 0, ch; (ch = rawcalc.charAt(i)); i++) {
    if ('^*/+-'.indexOf(ch) > -1) {
      if (current == '' && ch == '-') {
        current = '-';
      } else {
        calculation.push(parseFloat(current), ch);
        current = '';
      }
    } else {
      current += rawcalc.charAt(i);
    }
  }
  if (current != '') {
    calculation.push(parseFloat(current));
  }

  // --- Perform a calculation expressed as an array of operators and numbers
  var ops = [
      { '^': (a, b) => Math.pow(a, b) },
      { '*': (a, b) => a * b, '/': (a, b) => a / b },
      { '+': (a, b) => a + b, '-': (a, b) => a - b },
    ],
    newCalc = [],
    currentOp;
  for (var i = 0; i < ops.length; i++) {
    for (var j = 0; j < calculation.length; j++) {
      if (ops[i][calculation[j]]) {
        currentOp = ops[i][calculation[j]];
      } else if (currentOp) {
        newCalc[newCalc.length - 1] = currentOp(newCalc[newCalc.length - 1], calculation[j]);
        currentOp = null;
      } else {
        newCalc.push(calculation[j]);
      }
      // console.llog(newCalc);
    }
    calculation = newCalc;
    newCalc = [];
  }
  if (calculation.length > 1) {
    return calculation;
  } else {
    return calculation[0];
  }
};