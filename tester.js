const OPERATIONS = '<>+-.,[]';

function stringToInt8Array(string) {
  return Int8Array.from(Buffer.from(string));
}
function int8ArrayToString(buffer) {
  return Buffer.from(buffer).toString();
}

class Tester {
  constructor(goal, worldSize, maxOps) {
    this.goal = stringToInt8Array(goal);
    this.console = new Int8Array(this.goal.length);
    this.data = new Int8Array(worldSize);
    this.maxOps = maxOps;

    this.maxDistance = Number.MAX_SAFE_INTEGER;

    this.operations = {};
    this.operationToString = {};
    OPERATIONS.split('').map((str) => {
      this.operations[str] = str.charCodeAt(0);
      this.operationToString[str.charCodeAt(0)] = str;
    });
  }

  test(code) {
    this.console.fill(0);
    this.data.fill(0);

    const ops = this.run(code);

    const distance = this.distance();

    //DEBUGGING
    //console.log(`console='${int8ArrayToString(this.console)}' goal='${int8ArrayToString(this.goal)}' distance=${distance} ops=${ops}`);

    // fitness
    //this.distance = distance;
    //this.ops = ops;
    return {distance, ops};
  }

  run(code) {
    let codeIndex = 0;
    let dataIndex = 0;
    let consoleIndex = 0;

    for (let ops = 0; ops < this.maxOps; ops++) {
      if (codeIndex > code.length) {
        return ops;
      }

      //DEBUGGING
      //console.log(`console='${int8ArrayToString(this.console)}' ops=${ops} codeIndex=${codeIndex} dataIndex=${dataIndex} code[codeIndex]='${this.operationToString[code[codeIndex]]}' data=${this.data}`);

      switch(code[codeIndex]) {
        case '>':
          dataIndex = (dataIndex + 1) % this.data.length;
          break;

        case '<':
          dataIndex = (dataIndex + this.data.length - 1) % this.data.length;
          break;

        case '+':
          this.data[dataIndex] += 1;
          break;

        case '-':
          this.data[dataIndex] -= 1;
          break;

        case '.':
          this.console[consoleIndex++] = this.data[dataIndex];
          if (consoleIndex == this.console.length) {
            return ops;
          }
          break;

        case ',':
          // TODO: should read user input?
          this.data[dataIndex] = 0;
          break;

        case '[':
          if (this.data[dataIndex] == 0) {
            //jump to matching ']'
            let depth = 1;
            while (true) {
              if (++codeIndex >= code.length) {
                return ops;
              }
              if (code[codeIndex] == '[') {
                ++depth;
              } else if (code[codeIndex] == ']') {
                if (--depth == 0) {
                  break;
                }
              }
            }
          }
          break;

        case ']':
          if (this.data[dataIndex] != 0) {
            //jump to matching '['
            let depth = 1;
            while (true) {
              if (--codeIndex < 0) {
                return ops;
              }
              if (code[codeIndex] == ']') {
                ++depth;
              } else if (code[codeIndex] == '[') {
                if (--depth == 0) {
                  break;
                }
              }
            }
          }
          break;
      }
      codeIndex++;
    }
    return this.maxOps;
  }

  distance() {
    let sum = 0;
    for (let i = 0; i < this.goal.length; i++) {
      sum += Math.abs(this.goal[i] - this.console[i]);
    }
    return sum;
  }
}

const tester = new Tester('hello', 50, 10000);

process.on('message', (message) => {
  //console.log('tester received', message);
  message.testResults = tester.test(message.genes);
  process.send(message);
});

//process.stdin.resume();
