const cluster = require('cluster');
const path = require('path');
const os = require('os');

function startCluster() {
  return new Promise((resolve, reject) => {
    cluster.setupMaster({
      exec: path.resolve(__dirname, 'tester.js')
    });
    const numTesters = os.cpus().length;
    const testers = Array.from({length: numTesters}, () => cluster.fork());
    let numTestersOnline = 0;
    cluster.on('online', (tester) => {
      console.log('Tester ' + tester.process.pid + ' is online');
      if (++numTestersOnline === testers.length) {
        resolve(testers);
      }
    });
    cluster.on('exit', (tester, code, signal) => {
      console.log('Tester ' + tester.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
      process.exit(1);
    });
  });
}

const OPERATIONS = '<>+-.,[]';

function stringToInt8Array(string) {
  return Int8Array.from(Buffer.from(string));
}
function int8ArrayToString(buffer) {
  return Buffer.from(buffer).toString();
}
function randomOperation() {
  return OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)].charCodeAt(0);
}




class Genome {
  constructor(length, geneFn) {
    this.genes = Int8Array.from({length}, geneFn);
    this.geneFn = geneFn;
  }

  testFitness(tester) {
    this.testResults = tester.test(this.genes);
    return this;
  }

  mate(otherGenome, victimGenome, rates) {
    const genomes = [this, otherGenome];
    let currentGenome = 0;

    for (let geneIndex = 0; geneIndex < this.genes.length; geneIndex++) {
      if (Math.random() < rates.geneticMutation) {
        victimGenome.genes[geneIndex] = this.geneFn();
        continue;
      }

      if (Math.random() < rates.geneticCrossover) {
        currentGenome = (currentGenome + 1) % 2;
      }

      const genomeIndex = Math.random() < rates.geneticRouletteSelection ? (currentGenome + 1) % 2 : currentGenome;
      victimGenome.genes[geneIndex] = genomes[genomeIndex].genes[geneIndex];
    }

    /*
    if (Math.random() < rates.geneticRotation) {
      const delta = Math.floor( Math.random() * this.genes.length );
      //delta = ((delta % this.genes.length) + this.rotate.length) % this.genes.length;

      this.genes = this.genes.slice(delta).concat(this.genes.slice(0, delta));
    }
    */

    return victimGenome;
  }

  isCorrect() {
    return this.testResults.distance === 0;
  }

  static compareFitness(a, b) {
    return a.testResults.distance - b.testResults.distance
      || a.testResults.maxOps - b.testResults.maxOps;
  }
}


class Population {
  constructor(populationSize, genomeSize, rates, geneFn, testers) {
    this.genomes = Array.from({length: populationSize}, () => new Genome(genomeSize, geneFn));

    // rates.survival
    // rates.geneticMutation
    // rates.geneticCrossover
    // rates.geneticRouletteSelection
    // rates.geneticRotation
    this.rates = rates;

    this.testers = testers;
  }

  _testAll() {
    return new Promise((resolve, reject) => {
      const genes = this.genomes.map((genome) => int8ArrayToString(genome.genes));
      let geneIndex = 0;
      let receivedCount = 0;

      const sendNextGenome = (tester) => {
        if (geneIndex < this.genomes.length) {
          tester.send({geneIndex: geneIndex, genes: genes[geneIndex]});
          geneIndex += 1;
        }
      };

      const onMessage = (tester, testerResults) => {
        this.genomes[testerResults.geneIndex].testResults = testerResults.testResults;
        
        if (++receivedCount == this.genomes.length) {
          cluster.removeListener('message', onMessage);
          resolve(this.genomes.filter((genome) => genome.isCorrect()));
          return;
        }

        sendNextGenome(tester);
      };

      cluster.on('message', onMessage);

      this.testers.forEach((tester) => sendNextGenome(tester));
    });
  }

  async live() {
    for (let generation = 0; ; generation++) {
      // test all genomes, yield any that are correct
      //yield* this.genomes.filter((genome) => genome.testFitness(this.tester).isCorrect());
      const winners = await this._testAll();
      if (winners.length > 0) {
        console.log('winner!');
        return winners[0];
      }

      // sort genomes by fitness
      this.genomes.sort(Genome.compareFitness);

      // replace the least fit genomes with mates of the most fit (make sure there are at least 2 survivors)
      const survivorIndex = Math.max(2, Math.floor( this.rates.survival * this.genomes.length ));
      for (let victimIndex = survivorIndex; victimIndex < this.genomes.length; victimIndex++) {
        // pick a random genome that won't be consumed
        const pick1 = Math.floor( Math.random() * survivorIndex );
        
        // pick another *different* random genome that won't be consumed
        let pick2;
        while (pick1 == (pick2 = Math.floor( Math.random() * survivorIndex )));

        // mate these two genomes, and replace the victim a newborn
        this.genomes[pick1].mate(this.genomes[pick2], this.genomes[victimIndex], this.rates);
      }

      if ((generation % 100) == 0) {
        console.log(`Generation ${generation} ...`);
        console.log(this.genomes[0].testResults);
        console.log(int8ArrayToString(this.genomes[0].genes));
      }
    }
  }
}


startCluster()
  .then((testers) => {
    const rates = {
      survival: .05,
      geneticMutation: .05,
      geneticCrossover: .05,
      geneticRouletteSelection: .05,
      geneticRotation: .05
    };
    const population = new Population(1000, 100, rates, randomOperation, testers);

    const winner = population.live()
      .then((winner) => {
        console.log(winner.testResults);
        console.log(int8ArrayToString(winner.genes));
      })
      .catch((err) => console.log('ERROR', err));
  })
  .catch(console.log);

// ai generated
//tester.test(stringToInt8Array('+[+++++-+>++>++-++++++<<]>++.[+.]'));
//tester.test(stringToInt8Array('++++++[++>+++++++<]>---.+<->.'));

// human generated
//tester.test(stringToInt8Array('+[+++++>+<]+[+++++>+<]>++.+.'));
//tester.test(stringToInt8Array('+++[----->+<]>+.+.'));
//tester.test(stringToInt8Array('++++++++++[>++++++++++<-]>++++.+.'));





