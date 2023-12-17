var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MemoryStore = require("memorystore")(session);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: "asdfasffdas",
  resave: false,
  saveUninitialized: true,
  store: new MemoryStore({
    checkPeriod: 86400000, // 24 hours (= 24 * 60 * 60 * 1000 ms)
  }),
  cookie: { maxAge: 86400000 },
}));

app.use(function (req, res, next) {
  //res.locals 객체는 html/view 클라이언트 사이드로 변수들을 보낼 수 있으며, 그 변수들은 오로지 거기서만 사용할 수 있다.
  res.locals.logined = req.session.logined;//ejs에서 사용
  res.locals.name = req.session.name;//ejs에서 사용
  res.locals.email = req.session.email;//ejs에서 사용);
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
//app.use('/board', require('./routes/board1'));
//app.use('/board', require('./routes/board2'));
app.use('/board', require('./routes/board3'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});
// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
app.listen(process.env.PORT || 80)