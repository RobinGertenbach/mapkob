mapkob = Object.create(null);


/**
 * Generic function to prepare input for consumption
 *
 * Type can be one of:
 *  - "plain text": A regular text, sentences are delimited by periods
 *  - "newline delim": Take a string where sentences are delimited by newlines
 *  - "sentence array": Takes an array of sentences.
 *
 * @param {Object} data The input data
 * @param {String} type The type of input
 * @return {Array} An array of strings, sentences delimited by undefined
 */
mapkob.prepareInput = function(data, type) {
  function splitSentenceArray(a) {
    var delimited = [];
    a.map(function(sentence, i) {
      delimited.push(sentence.trim());
      if (i < sentences.length - 1) {
        delimited.push(undefined);
      }
    });
    return delimited;
  }

  function flattenSentenceArray(a) {
    var wordSplitRe = new RegExp("[ .]+");
    return a.map(function(sentence) {
      return sentence === undefined ? [undefined] : sentence.split(wordSplitRe);
    }).reduce(function(x,y) {return x.concat(y);});
  }
  // plain text
  var plainTextSplitter = new RegExp("([\.!?]+)", "gm")
  //var plainTextSplitter = new RegExp("(\.)")
  if (type === "plain text") {
    data = data.replace(plainTextSplitter, "\n")
    type = "newline delim"
  }

  // newline delim
  var splitRe = new RegExp("[\n\r]+", "gm");
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
  return;
};


/**
 * Creates and empty Transition matrix
 *
 * @param {Number} n An integer specifying which type of n-gram to use
 * @return {Object} A Transition Matrix object
 */
mapkob.TransitionMatrix = function(n) {
  if (n % 1 !== 0 || n < 2) {throw "n needs to be an integer >= 2";}
  var uniqueWords = [];
  var matrix = {};
  var starts = {};

  this.stateSpace = [];
  this.matrix = {};
  this.initialStates = new mapkob.Row();
  this.n = n;
  return this;
};


/**
 * functional wrapper around constructor
 * Can train supplied data implicitly or load a JSONified Transition matrix.
 *
 * @param {Number} n An integer specifying which type of n-gram to use
 * @param {Object} input transition matrix input or a JSONified Matrix
 * @return {Object} A Transition Matrix
 */
mapkob.transitionMatrix = function(n, input) {
  n = n || 2;
  var output =  new mapkob.TransitionMatrix(n);

  try {
    data = JSON.parse(input);
    if (data.hasOwnProperty("type") && data.type === "mapkob Transition Matrix") {
      output.statceSpace = data.initialStates;
      output.matrix = data.matrix;
      output.initialStates = new mapkob.Row(data.initialStates.row);
    }
  } catch(err) {
    if (input !== undefined) {
      output.train(input);
    }
  }
  return output;
};


/**
 * Adds training data to an existing model
 *
 * @param {Array} words An array of consecutive words. delimited by undefined
 * @return {this} The trained model
 */
mapkob.TransitionMatrix.prototype.train = function(words) {
  function wordJoin(words, i, n) {
    var output = [];
    var offset = 1;
    while (n >= offset) {
      output.push(words[i + offset]);
      offset += 1;
    }

    return output
        .reduce(function(x,y) {return x + " " + y;})
        .replace(/undefined[\w, ]+/, "undefined");
  }

  // State space
  words.map(function(word, i) {
    if (this.stateSpace.indexOf(word) === -1) {
      this.stateSpace.push(word);
    }

    // Initial states
    if (words[i - 1] === undefined &&
        this.initialStates.row[word] === undefined) {
      this.initialStates.row[word] = 1;
      this.initialStates.stateSpace.push(word);
    } else if (words[i - 1] === undefined){
      this.initialStates.row[word] += 1;
    }

    // Rows
    if (this.matrix[word] === undefined) {
      this.matrix[word] = {};
    }
    var nextWord = wordJoin(words, i, this.n - 1);
    // Columns
    if (this.matrix[word][nextWord] === undefined) {
      this.matrix[word][nextWord] = 1;
    } else {
      this.matrix[word][nextWord] += 1;
    }
  }, this);
  return this;
};


/**
 * return the row of a matrix
 *
 * @param {String} row The row by name to look up
 * @return {Object} The row of the matrix
 */
mapkob.TransitionMatrix.prototype.getRow = function(row) {
  var output = new mapkob.Row(this.matrix[row]);
  return output;
};


/**
 * Generates a Markov chain
 *
 * @return {String} A Computer generated string
 */
mapkob.TransitionMatrix.prototype.generateChain = function() {
  var currentState = this.
    initialStates.
    probabilities().
    cumSum().
    pickState(Math.random());
  var output = [];
  while (true) {
    output.push(currentState);
    currentNGram = currentState.split(" ");
    currentState = currentNGram[currentNGram.length - 1];
    if (currentState === "undefined") {break;}
    currentState = this.
      getRow(currentState).
      probabilities().
      cumSum().
      pickState(Math.random());
  }
  return output.join(" ") + ".";
};


/**
 * Transforms a Transitionmatrix into an identifiable object
 *
 * @return {Object} A JSON file
 */
mapkob.TransitionMatrix.prototype.toJSON = function() {
  return JSON.stringify({
    type: "mapkob Transition Matrix",
    matrix: this.matrix,
    stateSpace: this.stateSpace,
    initialStates: this.initialStates
  });
};


/**
 * A Row mapkob row constructor
 *
 * @param {Object} input A simple object
 * @return {Object} A maokob row
 */
mapkob.Row = function(input) {
  if (input === undefined) {
    this.row = {};
    this.stateSpace = [];
  } else {
    this.row = input;
    this.stateSpace = Object.keys(input);
  }
  return this;
};


/**
 * Calculates the sum of the rows
 *
 * @return {Number} The sum of the values
 */
mapkob.Row.prototype.sum = function() {
  return this.stateSpace.map(function(state) {
    return this.row[state];
  }, this).reduce(function(x, y) {
    return x + y;
  });
};


/**
 * Calculates relative frequencies of a row
 *
 * @return {Object} A row
 */
mapkob.Row.prototype.probabilities = function() {
  var sum = this.sum();
  var probs = {};
  this.stateSpace.map(function(state) {
    probs[state] = this.row[state] / sum;
  }, this);
  return new mapkob.Row(probs);
};


/**
 * A row with the cumulative sums
 *
 * @return {Object} A row
 */
mapkob.Row.prototype.cumSum = function() {
  var sums = {};
  var sum = 0;
  this.stateSpace.map(function(state) {
    sum += this.row[state];
    sums[state] = sum;
  }, this);
  return new mapkob.Row(sums);
};


/**
 * return an array with the row's values
 *
 * @return {Array} The rows values
 */
mapkob.Row.prototype.values = function() {
  return this.stateSpace.map(function(state) {
    return this.row[state];
  }, this);
};


/**
 * Picks the state with the largest CDF that is smaller or equal to p
 * Technically the first one where the next is larger or the array ends
 *
 * @return {String} A state string
 */
mapkob.Row.prototype.pickState = function(p) {
  cdf = this.values();
  for (var col in cdf) {
    if (p <= cdf[col] && (cdf[col + 1] == undefined || cdf[col + 1] > p)) {
      return this.stateSpace[col];
    }
  }
};
