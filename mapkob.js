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
  function splitSentenceArray(a) {
    var delimited = [];
    a.map(function(sentence, i) {
      delimited.push(sentence);
      if (i < sentences.length - 1) {
        delimited.push(undefined)
      }
    });
    return delimited
  }

  function flattenSentenceArray(a) {
    var wordSplitRe = new RegExp("[ \.]+")
    return a.map(function(sentence) {
      return sentence === undefined ? [undefined] : sentence.split(wordSplitRe);
    }).reduce(function(x,y) {return x.concat(y)})
  }


  // newline delim
  var splitRe = new RegExp("[\n\r\.\!\?\t]+")
  if (type === "newline delim") {
    var sentences = data.split(splitRe);
    var delimited = splitSentenceArray(sentences);
    return flattenSentenceArray(delimited);

  }

  // sentence array
  if (type === "sentence array") {
    var delimited = splitSentenceArray(sentences);
    return flattenSentenceArray(delimited);
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


mapkob.TransitionMatrix = function(words) {
  var uniqueWords = [];
  var matrix = {};
  var starts = {};

  words.map(function(word, i) {
    // State Space
    if (uniqueWords.indexOf(word) === -1) {
      uniqueWords.push(word);
    }

    // Initial states
    if (i === 0) {
      starts[word] = 1;
    } else if (words[i - 1] === undefined) {
      if (Object.keys(starts).indexOf(word) === -1) {
        starts[word] = 1;
      } else {
        starts[word] += 1;
      }
    }

    var nextWord = words[i + 1];
    // Transition Matrix rows
    if (matrix[word] === undefined) {matrix[word] = {};}

    // Transition Matrix columns
    if (matrix[word][nextWord] === undefined) {
      matrix[word][nextWord] = 1;
    } else {
      matrix[word][nextWord] += 1;
    }
  })

  this.stateSpace = uniqueWords;
  this.matrix = matrix;
  this.initialStates = new mapkob.Row(starts);
  return this;
}


/**
 * Adds training data to an existing model
 */
mapkob.TransitionMatrix.prototype.update = function(words) {
  // State space
  words.map(function(word, i) {
    if (this.stateSpace.indexOf(word) === -1) {
      this.stateSpace.push(word);
    }

    // Initial states
    if (this.initialStates.row[word] === undefined) {
      this.initialStates.row[word] = 1;
      this.initialStates.stateSpace.push(word);
    } else {
      this.initialStates.row[word] += 1;
    }

    // Rows
    if (this.matrix[word] === undefined) {
      this.matrix[word] = {};
    }
    var nextWord = words[i + 1];
    // Columns
    if (this.matrix[word][nextWord] === undefined) {
      this.matrix[word][nextWord] = 1;
    } else {
      this.matrix[word][nextWord] += 1;
    }
  }, this)
  return this;
}


/**
 * Returns the row of a matrix
 *
 * @param {String} row The row by name to look up
 * @returns {Object} The row of the matrix
 */
mapkob.TransitionMatrix.prototype.getRow = function(row) {
  var row = new mapkob.Row(this.matrix[row]);
  return row;
}


/**
 * Calculates the sum of the rows
 *
 * @returns {Number} The sum of the values
 */
mapkob.Row.prototype.sum = function() {
  return this.stateSpace.map(function(state) {
    return this.row[state];
  }, this).reduce(function(x, y) {
    return x + y;
  })
}


/**
 * Calculates relative frequencies of a row
 *
 * @returns {Object} A row
 */
mapkob.Row.prototype.probabilities = function() {
  var sum = this.sum();
  var probs = {};
  this.stateSpace.map(function(state) {probs[state] = this.row[state] / sum}, this);
  return new mapkob.Row(probs)
}


/**
 * A row with the cumulative sums
 *
 * @returns {Object} A row
 */
mapkob.Row.prototype.cumSum = function() {
  var sums = {};
  var sum = 0;
  this.stateSpace.map(function(state) {
    sum += this.row[state];
    sums[state] = sum;
  }, this);
  return new mapkob.Row(sums);
}


/**
 * Returns an array with the row's values
 *
 * @returns {Array} The rows values
 */
mapkob.Row.prototype.values = function() {
  return this.stateSpace.map(function(state) {
    return this.row[state]
  }, this);
}


/**
 * Picks the state with the largest CDF that is smaller or equal to p
 * Technically the first one where the next is larger or the array ends
 *
 * @returns {String} A state string
 */
mapkob.Row.prototype.pickState = function(p) {
  cdf = this.values();
  for (var col in cdf) {
    if (p <= cdf[col] && (cdf[col + 1] == undefined || cdf[col + 1] > p)) {
      return this.stateSpace[col];
    }
  }
}


/**
 * Generates a Markov chain
 *
 * @returns {String} A Computer generated string
 */
mapkob.TransitionMatrix.prototype.generateChain = function() {
  var currentState = this.initialStates
                         .probabilities()
                         .cumSum()
                         .pickState(Math.random())
  var output = [];

  while (currentState !== "undefined" && currentState !== undefined) {
    output.push(currentState);
    var cumSums = this.getRow(currentState).probabilities().cumSum()
    currentState = cumSums.pickState(Math.random());
  }
  return output.join(" ");
}
