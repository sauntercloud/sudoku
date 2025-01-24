const solve = (function () {
  var CHUNK_SIZE = 3;
  var ROW_COL_SIZE = CHUNK_SIZE * CHUNK_SIZE;
  var SIZE = ROW_COL_SIZE * ROW_COL_SIZE;

  var MIN_HINTS = 17;

  function checkRow(puzzle, number, index) {
    var start = Math.floor(index / ROW_COL_SIZE) * ROW_COL_SIZE;
    for (var i = 0; i < ROW_COL_SIZE; i += 1) {
      if (puzzle[start + i] === number) {
        return false;
      }
    }
    return true;
  }

  function checkCol(puzzle, number, index) {
    var start = index % ROW_COL_SIZE;
    for (var i = 0; i < ROW_COL_SIZE; i += 1) {
      if (puzzle[start + (i * ROW_COL_SIZE)] === number) {
        return false;
      }
    }
    return true;
  }

  function check3x3(puzzle, number, index) {
    var start = index - ((index % ROW_COL_SIZE) % CHUNK_SIZE) -
      (ROW_COL_SIZE * (Math.floor(index / ROW_COL_SIZE) % CHUNK_SIZE));
    for (var i = 0; i < ROW_COL_SIZE; i += 1) {
      if (
        puzzle[start + (ROW_COL_SIZE * Math.floor(i / CHUNK_SIZE)) + (i % CHUNK_SIZE)] === number
      ) {
        return false;
      }
    }
    return true;
  }

  function check(puzzle, number, index) {
    return checkRow(puzzle, number, index) &&
      checkCol(puzzle, number, index) &&
      check3x3(puzzle, number, index);
  }

  var iterations = 0;
  function recursiveSolve(puzzle, index, maxIterations) {
    if (maxIterations !== 0 && ++iterations > maxIterations) {
      throw new Error('Max iterations reached. No solution found.');
    }
    if (index >= SIZE) {
      return true;
    } else if (puzzle[index] !== 0) {
      return recursiveSolve(puzzle, index + 1, maxIterations);
    }

    for (var number = 1; number <= ROW_COL_SIZE; number += 1) {
      if (check(puzzle, number, index)) {
        puzzle[index] = number;
        if (recursiveSolve(puzzle, index + 1, maxIterations)) {
          return true;
        }
      }
    }
    puzzle[index] = 0;
    return false;
  }

  function solve(puzzle, options) {
    var opts = {
      emptyValue: '0',
      hintCheck: true,
      outputArray: false,
      maxIterations: 1 << 20,
    };

    if (options !== undefined) {
      Object.assign(opts, options);
    }

    if (typeof puzzle === 'string') {
      puzzle = puzzle.split('');
    }

    if (!Array.isArray(puzzle)) {
      throw new TypeError('Puzzle must be string or array.');
    }

    if (puzzle.length !== SIZE) {
      throw new Error('Puzzle is an invalid size.');
    }

    var hints = 0;
    puzzle = puzzle.map(function (element) {
      if (element === opts.emptyValue || element === parseInt(opts.emptyValue, 10)) {
        return 0;
      }
      hints++;
      var value = parseInt(element, 10);
      if (isNaN(value) || value > 9 || value < 1) {
        throw new TypeError('Invalid puzzle value: ' + element);
      }
      return value;
    });

    if (opts.hintCheck && hints < MIN_HINTS) {
      throw new Error('A valid puzzle must have at least ' + MIN_HINTS + ' hints.');
    }

    if (!recursiveSolve(puzzle, 0, opts.maxIterations)) {
      throw new Error('Puzzle could not be solved.');
    }

    return opts.outputArray ? puzzle : puzzle.join('');
  }
  return solve
})()



class SudokuHelper {
  constructor() {
    this.solve = solve
  }
  async loadImageUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve(cv.imread(img))
      }
      img.onerror = () => {
        reject()
      }
      img.src = url
    })
  }
  async preprocess(mat){
    let result = null
    let src = null
    
    src = mat.clone()
    result = await this.preprocess_a(src)
    src.delete()
    if(result) return result

    src = mat.clone()
    result = await this.preprocess_b(mat)
    src.delete()
    if(result) return result

    /*
    src = mat.clone()
    result = await this.preprocess_c(mat)
    src.delete()
    if(result) return result
    */
    return null
  }
  async preprocess_b(mat) {

    const minSize = Math.min(mat.cols,mat.rows)
    const scale = 720 / minSize
    const w = parseInt(mat.cols * scale)
    const h = parseInt(mat.rows * scale)
    cv.resize(mat, mat, new cv.Size(w, h), 0, 0, cv.INTER_AREA);

    //灰度
    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY, 0);

    //模糊滤波
    cv.medianBlur(mat, mat,3)

    //二值化
    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 3);

    //边缘提取
    const canny = new cv.Mat()
    cv.Canny(mat, canny, 30, 150, 3, false)
    const contour = this.findMaxContour(canny,0)
    const points = this.getContourPoints(contour)
    if(points.length!=8) return null

    //反色
    cv.bitwise_not(mat, mat)

    //变换
    const transform = this.transform(mat, points)
    return transform
  }
  async preprocess_c(mat) {

    //灰度
    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY, 0);

    //滤波
    const dst = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC1);
    cv.threshold(mat, dst,  50, 255, cv.THRESH_BINARY_INV);
    cv.imshow('transform',dst)
    mat = dst
    dst.delete()


    /*
    const minSize = Math.min(mat.cols,mat.rows)
    const scale = 1080 / minSize
    const w = parseInt(mat.cols * scale)
    const h = parseInt(mat.rows * scale)
    cv.resize(mat, mat, new cv.Size(w, h), 0, 0, cv.INTER_AREA);
    */

    
    //二值化
    //cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 3, 2);

    //边缘提取
    const canny = new cv.Mat()
    cv.Canny(mat, canny, 30, 150, 3, false)
    const contour = this.findMaxContour(canny,5)
    const points = this.getContourPoints(contour)
    if(points.length!=8) return null

    //反色
    cv.bitwise_not(mat, mat)

    //变换
    const transform = this.transform(mat, points)
    return transform
  }
  async preprocess_a(mat) {

    const minSize = Math.min(mat.cols,mat.rows)
    const scale = 720 / minSize
    const w = parseInt(mat.cols * scale)
    const h = parseInt(mat.rows * scale)
    cv.resize(mat, mat, new cv.Size(w, h), 0, 0, cv.INTER_AREA);

    //灰度
    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY, 0);

    //模糊滤波
    cv.GaussianBlur(mat, mat, new cv.Size(5, 5), 0, 0);

    //二值化
    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 3, 2);

    //边缘提取
    const canny = new cv.Mat()
    cv.Canny(mat, canny, 30, 150, 3, false)
    const contour = this.findMaxContour(canny,5)
    const points = this.getContourPoints(contour)
    if(points.length!=8) return null

    //反色
    cv.bitwise_not(mat, mat)

    //变换
    const transform = this.transform(mat, points)
    return transform
  }
  async recognizeDigit(worker, mat, x, y) {
    const NUMBER_SIZE = 28
    const NUMBER_EGED = 6

    let text = ''
    const canvas = document.createElement('canvas')
    const scaleCanvas = document.createElement('canvas')
    scaleCanvas.width = NUMBER_SIZE + 2 * NUMBER_EGED
    scaleCanvas.height = NUMBER_SIZE + 2 * NUMBER_EGED
    const scaleCtx = scaleCanvas.getContext('2d')
    const width = parseInt(mat.cols / 9)
    const height = parseInt(mat.rows / 9)
    const rect = new cv.Rect(x * width, y * height, width, height)
    const cropped = mat.roi(rect)
    const dilate = this.dilate(cropped, 2)
    const rc = this.findNumberRect(dilate)
    dilate.delete()

    if (rc) {
      const number = cropped.roi(rc);
      cv.bitwise_not(number, number)
      cv.imshow(canvas, number)
      number.delete()
      const edge = Math.max(canvas.width, canvas.height)
      const w = canvas.width / edge * NUMBER_SIZE
      const h = canvas.height / edge * NUMBER_SIZE
      scaleCtx.save()
      scaleCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, (scaleCanvas.width - w) / 2 + NUMBER_EGED, (scaleCanvas.height - h) / 2 + NUMBER_EGED, w, h)
      const result = await worker.recognize(scaleCanvas);
      text = result.data.text.trim()
      scaleCtx.restore()
    }
    cropped.delete()
    return text ? text : '0'
  }
  drawSudoku(canvas, problems, answers) {
    const context = canvas.getContext('2d');
    // 定义数独的行和列
    const rows = 9;
    const cols = 9;
    const size = canvas.width / 9;

    // 绘制网格线
    for (let i = 0; i < rows + 1; i++) {
      context.lineWidth = (i == 0 || i == rows) ? 2 : 1
      context.beginPath();
      context.moveTo(0, i * size);
      context.lineTo(canvas.width, i * size);
      context.strokeStyle = '#000';
      context.stroke();
    }

    for (let j = 0; j < cols + 1; j++) {
      context.lineWidth = (j == 0 || j == cols) ? 2 : 1
      context.beginPath();
      context.moveTo(j * size, 0);
      context.lineTo(j * size, canvas.height);
      context.strokeStyle = '#000';
      context.stroke();
    }

    // 绘制数独的数字

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const idx = i * cols + j
        const n = (!answers[idx] || answers[idx]) == '0' ? '' : answers[idx];
        context.font = '20px Arial';
        context.fillStyle = problems[idx] == answers[idx] ? '#000' : '#F00';
        const textWidth = context.measureText(n).width;
        context.fillText(n, j * size + (size - textWidth) / 2, i * size + (size - 15) / 2 + 15);
      }
    }
  }

  dilate(mat, size = 5) {
    const dst = new cv.Mat();
    const M = cv.Mat.ones(size, size, cv.CV_8U);
    const anchor = new cv.Point(-1, -1);
    cv.dilate(mat, dst, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    return dst
  }
  findContours(mat, size = 5) {
    const hierarchy = new cv.Mat();
    const dilate = size ? this.dilate(mat, size) : mat.clone()
    const contourVector = new cv.MatVector();
    cv.findContours(dilate, contourVector, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    dilate.delete()
    hierarchy.delete()
    return contourVector
  }
  findNumberRect(mat) {
    cv.threshold(mat, mat, 100, 255, cv.THRESH_BINARY);
    const width = mat.cols
    const height = mat.rows
    const thresholdAreaMax = mat.cols * mat.rows * 0.7
    const thresholdAreaMin = mat.cols * mat.rows * 0.01
    const EDGE_X = parseInt(width / 2.5)
    const EDGE_Y = parseInt(height / 2.5)
    const dst = mat.clone()
    let seek = null
    let maxArea = -Infinity
    for (let y = EDGE_Y; y < height - EDGE_Y; y++) {
      for (let x = EDGE_X; x < width - EDGE_X; x++) {
        const color = dst.data8S[y * width + x] & 0xff
        if (color == 0xff) {
          const seed = new cv.Point(x, y)
          const tmp = new cv.Mat()
          const area = cv.floodFill(dst, tmp, seed, new cv.Scalar(64, 64, 64))
          tmp.delete()
          if(maxArea<area && thresholdAreaMin<area && area<thresholdAreaMax){
            maxArea = area
            seek = [x,y]
          }
        }
      }
    }
    dst.delete()
    if(seek){
      const [x,y] = seek
      const tmp = new cv.Mat()
      cv.floodFill(mat, tmp, new cv.Point(x, y), new cv.Scalar(64, 64, 64))
      tmp.delete()
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const color = mat.data8S[idx] & 0xff
        if(color == 64){
          mat.data8S[idx] = 0xff
        }else{
          mat.data8S[idx] = 0
        }
      }
    }
    const contour = this.findMaxContour(mat)
    if (!contour) return null
    const rc = cv.boundingRect(contour)
    contour.delete()
    return rc
  }
  findMaxContour(mat,dilate=5) {
    const contourVector = this.findContours(mat, dilate)
    let maxAreaIdx = -1
    let maxArea = -Infinity
    const thresholdAreaMax = mat.cols * mat.rows * 0.7
    const thresholdAreaMin = mat.cols * mat.rows * 0.02
    for (let i = 0; i < contourVector.size(); i++) {
      const contour = contourVector.get(i);
      const area = cv.contourArea(contour)
      if (maxArea < area && area < thresholdAreaMax && area > thresholdAreaMin) {
        maxArea = area
        maxAreaIdx = i
      }
    }
    if (maxAreaIdx < 0) return null
    const contour = contourVector.get(maxAreaIdx)
    contourVector.delete()
    return contour
  }
  getContourPoints(contour) {
    if (!contour) return []
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, cv.arcLength(contour, true) * 0.02, true);
    if(approx.cols * approx.rows !=4) return []
    const data = approx.data32S
    let points = [
      [data[0], data[1]],
      [data[2], data[3]],
      [data[4], data[5]],
      [data[6], data[7]]
    ]
    const centery = points.reduce((val, p) => val + p[1], 0) / points.length
    const top = points.filter(p => p[1] <= centery).sort((p1, p2) => p1[0] - p2[0])
    const bottom = points.filter(p => p[1] > centery).sort((p1, p2) => p1[0] - p2[0])
    points = [top.flat(), bottom.flat()]
    approx.delete()
   
    return points.flatMap(e => e)
  }
  transform(mat, points) {
    const dst = cv.Mat.zeros(mat.cols, mat.rows, cv.CV_8UC3);
    const dsize = new cv.Size(mat.cols, mat.rows);
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, points);
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, mat.cols, 0, 0, mat.rows, mat.cols, mat.rows]);
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(mat, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    srcTri.delete()
    dstTri.delete()
    M.delete()
    const resizeDSize = new cv.Size(360 * 3, 360 * 3);
    cv.resize(dst, dst, resizeDSize, 0, 0, cv.INTER_AREA);
    return dst;
  }

  drawContours(canvas, mat, contourVector) {
    const dst = cv.Mat.zeros(mat.rows, mat.cols, cv.CV_8UC3);
    for (let i = 0; i < contourVector.size(); i++) {
      const color = [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255)]
      cv.drawContours(dst, contourVector, i, new cv.Scalar(color[0], color[1], color[2]), 1);
    }
    cv.imshow(canvas, dst)
    dst.delete()
  }
  drawContour(canvas, mat, contour, color) {
    const contourVector = new cv.MatVector();
    contourVector.push_back(contour)

    if (!color) {
      color = [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255)]
    }
    const dst = cv.Mat.zeros(mat.rows, mat.cols, cv.CV_8UC3);
    cv.drawContours(dst, contourVector, 0, new cv.Scalar(color[0], color[1], color[2]), 1);
    cv.imshow(canvas, dst)
    dst.delete()
  }
}

window.sudoku = new SudokuHelper()