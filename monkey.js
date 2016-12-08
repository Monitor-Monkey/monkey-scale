
module.exports = function(app,config) {

  const usage = require('usage');
  const monitor = require("os-monitor");
  const cluster = require('cluster');
  const os = require('os');
  const colors = require('colors');

// ===== Configuration ==== //
  const numCPUs = os.cpus().length;
  let minWorkers;
  let maxWorkers;

  if (config.threshold) {
    minWorkers = config.threshold;
  } else {
    minWorkers = numCPUs;
  }

  if (config.limit) {
    maxWorkers = config.limit;
  } else {
    maxWorkers = (minWorkers * 2);
  }
// ========================= //

  if (cluster.isMaster) {

    let workerData = [];

    const setWorker = function(wrkr) {
      wrkr.on('message', function(msg) {
        if (msg.req === 'init') {
          workerData.push(msg);
        } else if (msg.req === 'update') {
          for (let i = 0; i < workerData.length; i++) {
            if (workerData[i].id === msg.id) {
              workerData[i] = msg;
            }
          }
        } else if (msg.req === 'overview') {
          wrkr.send(workerData);
        }
      });
    };

    for (var i = 0; i < minWorkers; i++) {
      let wrkr = cluster.fork();
      // when this worker sends a message to master
      setWorker(wrkr);
    }

    setInterval(function() {
      // repeatedly tell workers to give updates every second
      for (let id in cluster.workers) {
        cluster.workers[id].send({cmd: 'update'});
      }

      if (workerData[0].data) {
          console.log('\033c');
          for (let i=0; i < workerData.length; i++) {

            try {

              const id = workerData[i].id.toString();
              let cpu = workerData[i].data.cpu;
              let CPU = cpu.toString();

              if (cpu >= 20) {
                console.log('Worker: ' + id.cyan + '   CPU usage: ' + CPU.red + '%'.red);
                let wrkr = cluster.fork();
                setWorker(wrkr);

              } else if ((cpu >= 10) && (cpu < 20)) {
                console.log('Worker: ' + id.cyan + '   CPU usage: ' + CPU.yellow + '%'.yellow);
                let wrkr = cluster.fork();
                setWorker(wrkr);

              } else {
                console.log('Worker: ' + id.cyan + '   CPU usage: ' + CPU.green + '%'.green);
                if ((cpu === 0) && (workerData.length > minWorkers)) {
                  console.log('Scaling down...'.yellow);
                  workerData.splice(i,1);
                 cluster.workers[id].send({cmd: 'kill'});

                }
              }
            } catch (e) {
              console.log('Worker: ' + workerData[i].id.toString() + ' DOWN!!'.red);
            }

        }
      }
    }, 1000);

      // When worker dies, remove it from workerData
      // Then check if number of workers is below threshold.
      // If so, spin up another one in its place..
      cluster.on('exit', (worker, code, signal) => {
        // console.log(`worker ${worker.process.pid} died`.red);
        const remWorkerData = new Promise(function(resolve) {
          for (let i = 0; i < workerData.length; i++) {
            if (workerData[i].id === worker.process.pid) {
              workerData.splice(i,1);
              resolve(true);
            }
          }
        });
        remWorkerData.then(function(data) {
          if (workerData.length < minWorkers) {
            const wrkr = cluster.fork();
            setWorker(wrkr);
          }
        })
      });
  　
    } else {

      //================ workers ==================//

        let overview = []; // mirrors workerData for workers

        app.listen(app.get('port'), function() {
          let id = process.pid;
          process.send({
            id: id,
            data: {},
            req: 'init' // first time push
          });
          const port = app.get('port').toString();
          console.log('ID: ' + id.toString().cyan + '- running on port: ' + port.green);
        });

        // receive messages from master
        process.on('message', function(msg) {
          if (msg.cmd === 'update') {
            // send data back to master
            usage.lookup(process.pid, function(err,res) {
              process.send({
                id: process.pid,
                data: res,
                req: 'update'
              });
            });
          } else if (msg.cmd === 'kill') {
            process.kill();
          } else {
            overview = msg;
          }
        });


        // route to view JSON data on localhost
        app.get('/monkey-monitor', function(req,res) {

          const getOverview = new Promise(function(resolve,reject) {
            process.send({req: 'overview'});
            if (overview.length > 0) {
              resolve(overview);
            } else {
              reject('updating...');
            }
          });

          getOverview.then(function(data) {
            res.send(data);
          }, function(err) {
            res.send(err);
          })
        });

  }
};
　
　
