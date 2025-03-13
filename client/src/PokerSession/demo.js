// example input
function generateUniqueObject(numKeys) {
  const result = {};
  const usedKeys = new Set();
  const usedValues = new Set();

  for (let i = 0; i < numKeys; i++) {
    // Generate a unique key and value based on the index to avoid collisions
    const key = `key_${i}`;
    const value = `value_${i}`;

    result[key] = value;

    // Track used keys and values (optional for this approach)
    usedKeys.add(key);
    usedValues.add(value);
  }

  return result;
}

const numberOfEntries = [10, 100, 1000, 10000, 100000, 1000000];
const numberOfRepeats = 30;
const output = {
  A: {},
  B: {},
  C: {},
  D: {},
};

// option A: Object.entries() and reduce()
console.log('Working on Option A');
const timesForA = {};
for (let num of numberOfEntries) {
  const objA = generateUniqueObject(num);
  timesForA.num = [];
  for (var i = 0; i < numberOfRepeats; i++) {
    const tStart = window.performance.now();
    const swappedObjA = Object.entries(objA).reduce((acc, [key, value]) => {
      acc[value] = key;
      return acc;
    }, {});
    const tEnd = window.performance.now();
    const totalTime = tEnd - tStart;
    timesForA.num.push(totalTime);
  }
  const averageTime =
    timesForA.num.reduce((a, b) => a + b, 0) / timesForA.num.length;
  output['A'][num] = averageTime;
}

// option B: using for...in loop
console.log('Working on Option B');
const timesForB = {};
for (let num of numberOfEntries) {
  const objB = generateUniqueObject(num);
  timesForB.num = [];
  for (var j = 0; j < numberOfRepeats; j++) {
    const tStart = new Date().getTime();
    /////// FUNCTION HERE ////////
    const swappedObjB = {};
    for (let key in objB) {
      if (objB.hasOwnProperty(key)) {
        swappedObjB[objB[key]] = key;
      }
    }
    /////// FUNCTION HERE ////////
    const tEnd = new Date().getTime();
    const totalTime = tEnd - tStart;
    timesForB.num.push(totalTime);
  }
  const averageTime =
    timesForB.num.reduce((a, b) => a + b, 0) / timesForB.num.length;
  output['B'][num] = averageTime;
}

// option C: Object.keys() and forEach()
console.log('Working on Option C');
const timesForC = {};
for (let num of numberOfEntries) {
  const objC = generateUniqueObject(num);
  timesForC.num = [];
  for (var k = 0; k < numberOfRepeats; k++) {
    const tStart = new Date().getTime();
    /////// FUNCTION HERE ////////
    const swappedObjC = {};
    Object.keys(objC).forEach((key) => {
      swappedObjC[objC[key]] = key;
    });
    /////// FUNCTION HERE ////////
    const tEnd = new Date().getTime();
    const totalTime = tEnd - tStart;
    timesForC.num.push(totalTime);
  }
  const averageTime =
    timesForC.num.reduce((a, b) => a + b, 0) / timesForC.num.length;
  output['C'][num] = averageTime;
}

// option D: using Object.fromEntries() and map()
console.log('Working on Option D');
const timesForD = {};
for (let num of numberOfEntries) {
  const objD = generateUniqueObject(num);
  timesForD.num = [];
  for (var l = 0; l < numberOfRepeats; l++) {
    const tStart = new Date().getTime();
    /////// FUNCTION HERE ////////
    const swappedObjD = Object.fromEntries(
      Object.entries(objD).map(([key, value]) => [value, key])
    );
    /////// FUNCTION HERE ////////
    const tEnd = new Date().getTime();
    const totalTime = tEnd - tStart;
    timesForD.num.push(totalTime);
  }
  const averageTime =
    timesForD.num.reduce((a, b) => a + b, 0) / timesForD.num.length;
  output['D'][num] = averageTime;
}

console.log(output);
