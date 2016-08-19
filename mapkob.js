mapkob = Object.create(null);


/**
 * Generic function to prepare input for consumption
 *
 * Type can be one of:
 *  - "newline delim": Take a string where sentences are delimited by newlines
 *  -
 *
 * @param {Object} data The input data
 * @param {String} type The type of input
 * @returns {Array} An array of strings, sentences delimited by undefined
 */
mapkob.prepareInput = function(data, type) {

  // newline delim
  var splitRe = new RegExp("([\n\r\.]+)")
  if (type === "newline delim") {
    var sentences = data.split(splitRe);
    var delimited = [];
    sentences.map(function(sentence, i) {
      delimited.push(sentence);
      if (i < sentences.length - 1) {
        delimited.push(undefined)
      }
    });

    return delimited.map(function(sentence) {
      return sentence === undefined ? [undefined] : sentence.split(" ");
    }).reduce(function(x,y) {return x.concat(y)})
  }
  return
}


/**
 * A Row mapkob row constructor
 *
 * @param {Object} input A simple object
 * @returns {Object} A maokob row
 */
mapkob.Row = function(input) {
  this.row = input;
  this.stateSpace = Object.keys(input);
  return this;
}


/**
 * Initializes a n x n zero matrix for the states
 *
 * @param {Array} stateSpace The state space
 * @returns {Object} A mapkob zero matrix
 */
mapkob.InitializeZeroMatrix = function(stateSpace) {
  var frequencyMatrix = {};
  var stateObject = {};

  stateSpace.map(function(word) {
    var stateObject = {};
    stateSpace.map(function(word) {stateObject[word] = 0;})
    frequencyMatrix[word] = stateObject;
  });

  this.stateSpace = stateSpace;
  this.matrix = frequencyMatrix;
  return this;
}


/**
 * A basic matrix serving as a parent
 *
 * returns {Object} A mapkob matrix object
 */
mapkob.Matrix = function() {
  this.matrix = {};
  this.stateSpace = [];
  this.type = "mapkob matrix";
  return this;
}


mapkob.SparseTransitionMatrix = function(words) {
  mapkob.Matrix.call(this);
  var uniqueWords = mapkob.unique(words.concat(undefined));
  this.stateSpace = uniqueWords;

  var matrix = {};
  uniqueWords.map(function(word) {matrix[word] = {};});
  words.map(function(word, i) {
    var nextWord = words[i + 1];

    if (matrix[word][nextWord] === undefined) {
      matrix[word][nextWord] = 1;
    } else {
      matrix[word][nextWord] += 1;
    }
  })
  this.matrix = matrix;
  this.type = "mapkob frequency matrix";
  return this;
}


/**
 * Returns a list of unique elements
 *
 * @param {Array} input The array of elements
 * @returns {Array} The deduped array
 */
mapkob.unique = function(input) {
  var output = [];
  input.map(function(element) {
    if (output.indexOf(element) === -1) {
      output.push(element)}});
  return output;
}


/**
 * Returns the row of a matrix
 *
 * @param {String} row The row by name to look up
 * @returns {Object} The row of the matrix
 */
mapkob.Matrix.prototype.getRow = function(row) {
  var row = new mapkob.Row(this.matrix[row]);
  return row;
}






// Let Special Matrix types inherit generic methods
mapkob.SparseTransitionMatrix.prototype = new mapkob.Matrix();


/**
 * Generates a sumulated Markov chain
 *
 * @returns {String} A Computer generated string
 */
mapkob.SparseTransitionMatrix.prototype.generateChain = function() {
  var stateI = Math.floor(Math.random() * this.stateSpace.length);
  var currentState = this.stateSpace[stateI];
  var output = [];

  while (currentState !== "undefined" && currentState !== undefined) {
    output.push(currentState);
    var currentRow = this.getRow(currentState);
    var rowSum = currentRow.stateSpace.map(function(state) {
      return currentRow.row[state];
    }).reduce(function(x, y) {return x + y});

    var probs = currentRow.stateSpace.map(function(state) {
      return currentRow.row[state] / rowSum;
    });

    var cumSums = probs.map(function(state, stateI) {
      var sum = 0;
      for (var i = 0; i <= stateI; i++) {
        sum += probs[i];
      }
      return sum;
    })

    var r = Math.random();
    for (var col in cumSums) {
      if (r <= cumSums[col] && (cumSums[col+1] === undefined || cumSums[col+1] > r)) {
        stateI = col;
        break;
      }
    }
    currentState = currentRow.stateSpace[stateI];
  }
  return output.join(" ");
}
