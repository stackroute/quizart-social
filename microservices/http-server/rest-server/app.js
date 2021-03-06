var seneca = require('seneca');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var request = require('request');

var cloudinary = require('cloudinary');
var formidable = require('express-formidable');
var secret = process.env.AUTH_SECRET || "the matrix";
var googlecredentials = require('./secrets/googlecredentials');
var oauth2Client = new OAuth2(googlecredentials.CLIENT_ID, googlecredentials.CLIENT_SECRET, googlecredentials.REDIRECT_URL);
var redirectHost = process.env.REDIRECT_HOST || "localhost";
var port = process.env.PORT || '8001';
var redirectPort = process.env.REDIRECT_PORT || port;
// var redirectPort = 8001;
// var redirectHost = "192.168.99.101";
var name = process.env.NAME || "default";
var mesh = seneca();
mesh.use('mesh',{auto:true});
var context = require('./context');

var cloudinary = require('cloudinary');
var formidable = require('express-formidable');

var chatMiddlewarePlugin  = require('./chatmiddlewareplugin');

context.mesh = mesh;
var twitterStream = require('./api/timeline/TwitterStream');

context.authorizeMiddleware = function(req, res, next) {
  mesh.act('role:jwt,cmd:verify', {token: req.get('JWT')}, function(err, response) {
    if(err) { return res.status(500).json(err); }
    if(response.response !== 'success') { return res.status(404).send(); }
    req.claims = response.claims;
    next();
  });
};

var schedular = require('./schedular');
schedular();

var env = process.env.NODE_ENV || 'dev';

app.use(express.static(__dirname + '/../common-ui'));

if(env.trim() === 'dev') {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, jwt");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH");
    // console.log("inside server checking env",env);
    next();
  });
};

app.use(require('body-parser').json());
app.set('secret',secret);
app.use('/api/v1', require('./router'));

var chat = io.of('/chat');

app.post('/api/generateuuid/uuid',function(req,res){
  const redis=require('redis');
  const publisher=redis.createClient(6379,'172.23.238.253');
  const subscriber=redis.createClient(6379,'172.23.238.253');
  subscriber.subscribe(req.body.message.content);
  publisher.publish('ChatService2',JSON.stringify(req.body));
  subscriber.on('message',function(channel,message){
    var message1=JSON.parse(message);
    res.send({response:'success',result:message1});
  });

});


app.use(formidable.parse());
app.post('/api/uploadfile',function(req,res){
console.log('-------------- abc from express floow---------------',req.body);
console.log('-------------- abc from express floow---------------',req.body.file.path);

cloudinary.config({
cloud_name: 'quizrt-social',
api_key: '866928426995948',
api_secret: 'a0_PX4nmJqak_k3lc29Ges5dcNw'
});

cloudinary.uploader.upload(req.body.file.path, function(result) {
console.log(result);
});
});


var tweets =io.of('/tweets');
app.post('/api/authenticate/google',function(req,res,next){
  console.log("Inside Express, inside google login call=======");

  // generate a url that asks permissions for Google+ and Google Calendar scopes
  var scopes = [
    googlecredentials.SCOPE[0],
    googlecredentials.SCOPE[1]
  ];

  var url = oauth2Client.generateAuthUrl({
    access_type: 'online', // 'online' (default) or 'offline' (gets refresh_token)
    scope: scopes,
    approval_prompt: "force" // If you only need one scope you can pass it as string
  });
  res.send({ redirect: url });
  // next();
});

app.get('/api/auth/success/google',function(req,res){
  // console.log("Inside google page===========");
  var code = req.query.code;
  // console.log("Inside Express, code to get Token is=============",code);
  oauth2Client.getToken(code, function(err, tokens) {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    // console.log("Inside Express , after getting token=======",tokens);
    // console.log("Inside Express , after getting token=======",JSON.stringify(tokens));
    if(!err) {
      oauth2Client.setCredentials(tokens);
    }
    if(err){
      console.log(err);
    }

    var access_token = tokens['access_token'];
    var user_profile = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token='+access_token;
      request({
        url: user_profile,
        json: true
      }, function (error, response, body) {
        if (!error) {
          // console.log("Inside the Express after getting the user profile the body is ======",body);
          var tokendata = {
            user : body.email
          }
          // console.log("Inside Express, the user profile token data========,",tokendata);
          mesh.act('role:jwt,cmd:generateGoogleToken',{data:tokendata},function(err,tokenresponse){
            if(err) { return res.status(500).json(err); }
            if(tokenresponse.response==='success'){
              var userObj = {
                username: tokendata.user,
                useravatar :body.picture,
                name : body.given_name,
                age : null,
                country : 'NA',
                totalGames : 0,
                liketopics: '',
                following: 0,
                followers: 0,
                category: 'Beginner'
              };
                mesh.act('role:profile,cmd:create',userObj,function(err,response){
                    if(err) { return res.status(500).json(err); }
                    if(response.response !== 'success') { res.redirect('http://'+redirectHost+':'+redirectPort+'/#/authsuccess/'+tokenresponse.token); }
                    res.redirect('http://'+redirectHost+':'+redirectPort+'/#/authsuccess/'+tokenresponse.token);
                });
            }
          });
      } else {
        res.redirect('/login');
          console.log(error);
      }
    })
  });

});

  tweets.on('connection',function(socket){
  console.log("===conected to tweet socket");
   twitterStream(socket);
});


  chat.on('connection',function(socket){
    console.log("Inside Express, Socket Connected");
    var chatmiddleware = new chatMiddlewarePlugin(socket);
  });


app.get('/topics',function(req,res) {
  console.log('form express-alltopics');
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  mesh.act('role:allTopics,action:retrive',function(err,result){
    if (err) return console.error(err)
  console.log('-----------------'+result+'------------------------')
  res.send(result)
  })
  console.log('send');
});


app.get('/topics/myfav',function(req,res) {
 mesh.act('role:myFav,action:retrive',{user:req.params.uid},function(err,result){
 if (err) return console.error(err)
console.log('------------yahi to hai result-----'+result+'------------------------')
res.send(result);
 })
 console.log('agrt dfglca;lkg');
 })

 app.get('/tournamentSection',function(req,res) {
   console.log('form express-tournamentSection');
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   mesh.act('role:randTournaments,action:retrive',function(err,result){
     if (err) return console.error(err)
   console.log('-----------------'+result+'------------------------')
   res.send(result)
   })
   console.log('send');
 });

 app.get('/tournaments',function(req,res) {
   console.log('form express-alltopics');
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   mesh.act('role:allTournaments,action:retrive',function(err,result){
     if (err) return console.error(err)
   console.log('-----------------'+result+'------------------------')
   res.send(result)
   })
   console.log('send');
 });

app.post('/api/check',function(req,res){
 console.log('-------------- abc from express floow---------------');
 console.log(req.body.incre+'   0----------------------');
 console.log(req.body.id+'    ---------------------');
 var test = {
   id:req.body.id,
   incre:req.body.incre,
   username:req.body.uName
 }

 var username = req.body.uName;

 mesh.act('role:topic,action:like',{data:test},function(err,result){

   if(err) console.log(err+'---------------------------------------done liked---------');

   console.log(result+'yaha thak hai>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
   if(!req.body.incre) {
     mesh.act('role:topic,action:delete',{data:test},function(err,result2){

       if(err) console.log(err+' ========================');

       res.send(result)
     })
   }
 })
});


app.use(function(req, res) {
  return res.status(404).send();
});



app.use(formidable.parse());
app.post('/api/check',function(req,res){
  console.log('-------------- abc from express floow---------------',req.body);
  //console.log('-------------- abc from express floow---------------',req.body.file);
  console.log('-------------- abc from express floow---------------',req.body.file.path);
  //console.log(req.body.incre+'   0----------------------');
  //console.log(req.body.id+'    ---------------------');

  cloudinary.config({
   cloud_name: 'quizrt-social',
   api_key: '866928426995948',
   api_secret: 'a0_PX4nmJqak_k3lc29Ges5dcNw'
  });
  var url = '';
  cloudinary.uploader.upload(req.body.file.path, function(result) {
    url = result.url;
   console.log(result.url);
  });
  return url;
});

var middleWareCount =0;



io.on('connection',function(socket){
  middleWareCount++;
  console.log('\n =====Middleware count is: '+middleWareCount+'\n');
  var playerMiddleWareService =  require('seneca')();
   socket.on('playGame',function(msg){
     console.log(' \n\n Received play game message  \n\n');
     playerMiddleWareService.use('redis-transport');
    console.log('\n======Initializing plugin for  : '+(msg.username)+'\n');
    console.log('\n\n'+JSON.stringify(msg)+'\n\n');
    playerMiddleWareService.use('./gameplayMiddlewarePlugin', {
      username:msg.username,
      tournamentId:msg.tournamentId,
      isTournament:msg.isTournament,
      knockoutId:msg.knockoutId,
      socket:socket
    });
  });

  socket.on('disconnect',function(){
    console.log('\n======Closing service=====\n');
    playerMiddleWareService.close();
  })



  socket.emit('serverId',"This question is coming from "+name);

  socket.on('myAnswer',function(socketObj){
    console.log('\n==========Answer received by server is: '+socketObj.answer+'\n');
     playerMiddleWareService.act('role:user,action:answer',{answer:socketObj.answer},function(err,response){

     })
  });
})

exports = module.exports = server;
