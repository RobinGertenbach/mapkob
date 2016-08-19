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


/**
 * Fills a mapkob zero matrix with the state counts provided
 *
 * @param {Object} matrix A mapkob zero matrix
 * @param {Array} states The states provided
 * @returns {Object} A mapkob frequency matrix
 */
mapkob.FillZeroMatrix = function(matrix, states) {
  mapkob.Matrix.call(this);

  states.concat(undefined).map(function(state, i) {
    matrix.matrix[state][states[i + 1]] += 1;
  });

  matrix.stateSpace.map(function(state) {
    matrix.matrix[undefined][state] = 0;
  })
  matrix.matrix.undefined.undefined = 1;

  this.matrix = matrix.matrix;
  this.stateSpace = matrix.stateSpace;
  this.states = states;
  this.type = "mapkob zero matrix";
  return this;
} 


/**
 * Basic constructor for a transition matrix
 *
 * @param {Array} words An Array of words. Sentences are delimited by undefined.
 * @returns {TransitionMatrix} A TransitionMatric object
 */
mapkob.TransitionMatrix = function(words) {
  mapkob.Matrix.call(this);
  var uniqueWords = mapkob.unique(words);
  this.stateSpace = uniqueWords;

  var zeroMatrix = new mapkob.InitializeZeroMatrix(uniqueWords);
  var frequencyMatrix = new mapkob.FillZeroMatrix(zeroMatrix, words);
  
  
  this.matrix = frequencyMatrix.getRowProbabilities();
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
  return this.matrix[row];
}


/**
 * Returns the sum of a row of a matrix
 *
 * @param {String} row The row by name to look up
 * @returns {Number} The sum of the row's values
 */
mapkob.Matrix.prototype.getRowSum = function(row) {
  var sum = 0;
  var currentRow = this.getRow(row);
  this.stateSpace.map(function(col) {sum += currentRow[col]})  
  return sum;
}


/**
 * Calculates the cumulative sum for every column of a row
 *
 * @param {String} row The name of the state
 * @returns {Array} an array of length n with the cumulative sums
 */
mapkob.Matrix.prototype.getRowCumSum = function(row) {
  var output = [];
  var sum = 0;
  var currentRow = this.getRow(row);

  this.stateSpace.map(function(state) {
    sum += currentRow[state];
    output.push(sum);
  })
  return output;
}


/**
 * Returns the element of a matrix
 *
 * @param {String} row The row by name to look up
 * @param {String} col The column by name to look up
 * @returns {Number} The value of the element
 */
mapkob.Matrix.prototype.getElement = function(row, col) {
  return this.getRow(row)[col];
}


/**
 * Calculates the probabilities for a row of a frequencyMatrix
 *
 * @param{String} row The name of the row
 * @return {Object} A maokob row
 */
mapkob.Matrix.prototype.getProbabilitiesForRow = function(row) {
  var thisRow = this.getRow(row);
  var stateSpace = this.stateSpace;
  var sum = this.getRowSum(row);
  var output = {};
  stateSpace.map(function(state, i) {output[state] = thisRow[state] / sum})
  return output;
}


/**
 * Calculates rowwise density, i.e. probabilities
 * Should proably initialize a Matrix
 *
 * @returns {Object} An transition matrix (no mapkob object as of now)
 */
mapkob.Matrix.prototype.getRowProbabilities = function() {
  var stateSpace = this.stateSpace;
  var output = {};
  stateSpace.map(function(state) {
    output[state] = this.getProbabilitiesForRow(state);
  }, this);
  return output;
}




// Let Special Matrix types inherit generic methods
mapkob.InitializeZeroMatrix.prototype = new mapkob.Matrix();
mapkob.FillZeroMatrix.prototype = new mapkob.Matrix();
mapkob.TransitionMatrix.prototype = new mapkob.Matrix();


/**
 * Generates a sumulated Markov chain
 * 
 * @returns {String} A Computer generated string
 */
mapkob.TransitionMatrix.prototype.generateChain = function() {
  var stateI = Math.floor(Math.random() * this.stateSpace.length);
  var currentState = this.stateSpace[stateI];
  var output = [];

  while (currentState !== undefined) {
    output.push(currentState);
    var cumSums = this.getRowCumSum(currentState);
    var r = Math.random();
    for (var col in cumSums) {
      if (r <= cumSums[col] && (cumSums[col] === undefined || cumSums[col] > r)) {
        stateI = col;
        break;
      }
    }
    currentState = this.stateSpace[stateI];
  }
  return output.join(" ");
}
