const redis=require('redis');
const fs = require('fs');
const subscriber=redis.createClient(6379,'172.23.238.253');
const publisher=redis.createClient(6379,'172.23.238.253');


var MsgObj = {};

console.log("Running...");

subscriber.subscribe('uuidgenerator');

subscriber.on('message',function(channel,message){
      console.log("Subscribed to "+channel);
      // console.log("UUID to be published into the following channel,",JSON.parse(message));
      // console.log("UUID to be published into the following channel,",message);
      // console.log("Message from ,middleware plugin as it is ",message);
      var message1 = JSON.parse(message);
      console.log("Message from ,middleware plugin as it is after parsing is: ",message1);
      console.log("Command received is:",message1.message.command);
      console.log("Topic Id  received is:",message1.message.content);

      if(message1.message.command === 'generateUUID'){
        console.log("inside loop");
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        console.log("Generated UUID is ",uuid);
        var publishMsg ={
          message : { content: uuid, command : 'generateUUID' },
          details : message1.details
        }
        console.log("Type of topic id in generate UUId is ",typeof(message1.message.content));
        publisher.publish(message1.message.content,JSON.stringify(publishMsg));
      }

      else if(message1.message.command === 'sendMessage'){
            var publishMsg = {
              content : message1.message.content,
              text : message1.message.text,
              sentBy : message1.message.sentBy,
              command : message1.message.command
            };
            var topicId = message1.message.content;
            console.log("Message to be published into the requested channel "+topicId+" is "+JSON.stringify(publishMsg));
            publisher.publish(message1.message.content,JSON.stringify(publishMsg));

            var updateMsgObj = {
                text : message1.message.text,
                sentBy : message1.message.sentBy
            };
              if(!MsgObj[topicId]){
                      console.log("Msg from client to be put into MsgObj is===",updateMsgObj);
                      console.log("topic id to put into obj",topicId);
                      console.log("MsgObj inside first time before updation is ",MsgObj);
                      MsgObj[topicId] = {count: 1};
                      MsgObj[topicId][MsgObj[topicId].count] = updateMsgObj;
                      console.log("====MsgObj[topicId][MsgObj[topicId].count] is",MsgObj[topicId][MsgObj[topicId].count]);
                      // MsgObj[topicId] = [updateMsgObj];
                      console.log("====Msgobj updated is ",MsgObj);
              }
              else{
                    console.log("inside else loop for saving message");
                    var arr = MsgObj[topicId];
                    console.log("=====Already existing array is:",arr);
                      if(arr.count>=4){
                        console.log("Inside If Loop");
                          fs.mkdir('/data/chathistory/'+topicId,function(err,result){
                          console.log("Inside loop for creating directory");
                            if(err){
                              console.log("Inside loop for creating directory and there is an error logging the error",err);
                                if(err.code === "EEXIST"){
                                  console.log("History folder already Exist");
                                  fs.readdir('/data/chathistory/'+topicId,function(err,files){
                                      console.log("Inside Read File directory, retrieved number of files are,==",files);
                                      console.log("Inside Read File directory, retrieved number of files length is,==",files.length);
                                      var fileNumber = files.length;
                                      var file = '/data/chathistory/'+topicId+'/'+topicId+'-'+(fileNumber+1)+'.json';
                                      console.log("Inside loop for creating directory the new file to be written in old folder is ",file);
                                      fs.writeFile(file,JSON.stringify(MsgObj[topicId]),'utf-8',function cb(err,data){
                                          if(err){console.log("Error when writing the file and the error is ",err);}
                                          // MsgObj[topicId] = [];
                                          // MsgObj[topicId] = [updateMsgObj];
                                          MsgObj[topicId].count = MsgObj[topicId].count+1;
                                          console.log("Before Reseting the MsgObj, the count is",MsgObj[topicId].count);
                                          MsgObj[topicId] ={};
                                          console.log("After Reseting the MsgObj, the count is",MsgObj[topicId].count);
                                          MsgObj[topicId] = {count: MsgObj[topicId].count};
                                          MsgObj[topicId][MsgObj[topicId].count] = updateMsgObj;
                                          console.log("After Writing into file, the update MsgObj specific to topicid is",MsgObj[topicId]);
                                          console.log("After Writing into file, MsgObj is ",MsgObj);

                                      });
                                  });
                                }
                            }
                            else{
                              console.log("Inside loop for creating directory and ther is no folder existing ,so folder created");
                              var file = '/data/chathistory/'+topicId+'/'+topicId+'-1.json';
                              console.log("Inside loop for creating directory the new file to be written in new folder is ",file);
                              fs.writeFile(file,JSON.stringify(MsgObj[topicId]),'utf-8',function cb(err,data){
                                  if(err){console.log("Error when writing the file and the error is ",err);}
                                  // MsgObj[topicId] = [];
                                  // MsgObj[topicId] = [updateMsgObj];
                                  MsgObj[topicId].count = MsgObj[topicId].count+1;
                                  var temp = MsgObj[topicId].count ;
                                  console.log("Before Reseting the MsgObj, the count is",MsgObj[topicId].count);
                                  MsgObj[topicId] ={};
                                  console.log("After Reseting the MsgObj, the count is",MsgObj[topicId].count);
                                  console.log("After Reseting the MsgObj, the count is",temp);
                                  MsgObj[topicId] = {count: temp};
                                  MsgObj[topicId][MsgObj[topicId].count] = updateMsgObj;
                                  console.log("====After Writing into file, the update MsgObj specific to topicid is",MsgObj[topicId]);
                                  console.log("=====After Writing into file, MsgObj is ",MsgObj);
                              });
                            }
                          });
                      }
                      else{
                        console.log("Inside Else loop");
                        MsgObj[topicId].count = MsgObj[topicId].count+1;
                        MsgObj[topicId][MsgObj[topicId].count] = updateMsgObj;
                        console.log("===after appending new message into MsgObj is ",MsgObj);
                        console.log("===after appending new message into MsgObj specific to topic is ",MsgObj[topicId]);
                      }
                    // console.log("Length of array for the topic id "+topicId+" is "+arr.length);
                    // var arrayLength = arr.length;
                    // if(arrayLength>=4){
                    //   fs.mkdir('/data/chathistory/'+topicId,function(err,result){
                    //   console.log("Inside loop for creating directory");
                    //     if(err){
                    //       console.log("Inside loop for creating directory and ther is an error logging the error",err);
                    //       console.log("Inside loop for creating directory and ther is an error");
                    //         if(err.code === "EEXIST"){
                    //           console.log("History folder already Exist");
                    //           fs.readdir('/data/chathistory/'+topicId,function(err,files){
                    //               console.log("Inside Read File directory, retrieved number of files are,==",files);
                    //               console.log("Inside Read File directory, retrieved number of files length is,==",files.length);
                    //               var fileNumber = files.length;
                    //               var file = '/data/chathistory/'+topicId+'/'+topicId+'-'+(fileNumber+1)+'.json';
                    //               console.log("Inside loop for creating directory the new file to be written in old folder is ",file);
                    //               fs.writeFile(file,JSON.stringify(MsgObj),'utf-8',function cb(err,data){
                    //                   if(err){console.log("Error when writing the file and the error is ",err);}
                    //                   MsgObj[topicId] = [];
                    //                   MsgObj[topicId] = [updateMsgObj];
                    //               });
                    //           });
                    //         }
                    //     }
                    //     else{
                    //       console.log("Inside loop for creating directory and ther is no folder existing ,so folder created");
                    //       var file = '/data/chathistory/'+topicId+'/'+topicId+'-1.json';
                    //       console.log("Inside loop for creating directory the new file to be written in new folder is ",file);
                    //       fs.writeFile(file,JSON.stringify(MsgObj),'utf-8',function cb(err,data){
                    //           if(err){console.log("Error when writing the file and the error is ",err);}
                    //           MsgObj[topicId] = [];
                    //           MsgObj[topicId] = [updateMsgObj];
                    //           console.log("The New Message Object updated is ",MsgObj);
                    //       });
                    //     }
                    //   });
                    // }
                  //   else{
                  //     arr.unshift(updateMsgObj);
                  //     MsgObj[topicId] =arr;
                  //     console.log("inside save and update history, the MsgObj now is===",MsgObj);
                  // }
                }
              } //end of else if for send and save message

          else if(message1.message.command === 'retrieveHistory'){
            var topicId = message1.message.content;
            console.log("The topic id to be sent to read the file is",topicId);
            if(!MsgObj[topicId]){
              console.log("There is no History presentfor the topic id",topicId);
              var history={
                   'message':{
                     'command':'retrieveHistory',
                     'text':null,
                     'content':topicId
                   }
                 };
              publisher.publish(topicId,JSON.stringify(history));
            }
            else{
              fs.readdir('/data/chathistory/'+topicId,function(err,files){
                if(err){
                  console.log("Throwed an error while reading the directory:",err);
                }
                else if(files!==undefined){
                console.log("Inside Read File directory, retrieved number of files are,==",files);
                console.log("Inside Read File directory, retrieved number of files length is,==",files.length);
                var fileNumber = files.length;
                var fileToRead = '/data/chathistory/'+topicId+'/'+topicId+'-'+fileNumber+'.json';
                console.log("FileToRead is ",fileToRead);
                fs.readFile(fileToRead,'utf-8',function cb(err,data){
                  if(err){console.log("error while reading the file to retrieve history");}
                  obj = JSON.parse(data);
                  console.log("Parsed file data to retrive history:",obj);
                  console.log("Local MsgObj in memeory is,",MsgObj[topicId]);
                  var arr = [MsgObj[topicId]];
                  //arr.unshift(MsgObj[topicId]);
                  console.log("The array before concating local in memory object",arr);
                  var arr1 = arr.concat([obj]);
                  console.log("The array after concating is arr1",arr1);
                  console.log("The array after concating is ",arr1);
                  var history={
                       'message':{
                         'command':'retrieveHistory',
                         'text':obj,
                         'content':topicId
                       }
                     }
                  publisher.publish(topicId,JSON.stringify(history));
                });
              }
              });

            }
          }


});