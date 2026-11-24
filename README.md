# genetic

[![License](https://img.shields.io/badge/license-MIT-lightgray.svg)](https://github.com/andrewmacheret/genetic/blob/master/LICENSE.md)

A genetic algorithm in Node.js that evolves [Brainfuck](https://en.wikipedia.org/wiki/Brainfuck) programs until one prints a goal string. Each generation is tested in parallel across every CPU core, and the fittest programs are mated to replace the rest.

## Usage

```
node bf.js
```

Progress is printed every 100 generations, and the winning program is printed when one is found.
