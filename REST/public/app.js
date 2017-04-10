'use strict'

$(function () {
	var socket = io();

    var data = {
		labels: [],
		datasets: [
		{
			label: "Mint moisture",
			backgroundColor: "rgba(0,175,76,0.2)",
			data: []
		}]
	};

    for(var i = 0; i != 24; i++){
        data.labels[i] = i;
        data.datasets[0].data[i] = 0;
    }

	var ctx = document.getElementById("myChart").getContext('2d');
    
	var myChart = new Chart(ctx,{
        type: 'line',
        data: data,
        animation:{
           animateScale:true
        },
        options: {
        	responsive: true,
            maintainAspectRatio: true
        }
    });

    socket.on('value', function (response){
    	try{
    		var jsonData = JSON.parse(response);
    		myChart.data.datasets[0].data[jsonData.id] = mapValues(
    			jsonData.value, 0, 1024, 100, 0);
    		var leavesVal = mapValues(jsonData.value, 200, 1024, 0, 100);
     		var green = mapValues(jsonData.value, 300, 1024, 255, 0);
     		var red = 255 - Math.round(green);
     		myChart.data.datasets[0].backgroundColor = 'rgba(' + red + ',' + 
     		Math.round(green) + ',0,0.3)';
     		myChart.update();
     		if(leavesVal >= 0){
     			$("#leaves").css({'filter': 'sepia('+leavesVal+'%)'});
     		} else {
     			$("#leaves").css({'filter': 'sepia(0%)'});
     		}
    	} catch (err) {
    		console.log('error socket.on value', err);
    	}
    });

    socket.on('dataSet', function(response){
    	try{
    		var jsonData = JSON.parse(response);
    		jsonData.forEach((item) => {
    		myChart.data.datasets[0].data[item.id] = mapValues(item.value,
    			0, 1024, 100, 0);
			});
			myChart.update();
    	} catch (err) {
    		console.log('err', err);
    	}
    });

    setInterval(function() {
    	var d = new Date();
    	var t = d.getTime();
    	var interval = 60*1000;
    	var last = t - t % interval;
    	var nextt = last + interval + 60000;
    	d.setTime(nextt);
    	var hours = d.getHours();
    	var min = d.getMinutes();
    	$(".clock").html(zeroPadding(hours)+":"+zeroPadding(min));
    }, 1000);

    function zeroPadding(num){
    	if(num < 10){
    		num = "0" + num;
    	}
    	return num;
    }

    function mapValues(X, A, B, C, D){
    	return (X-A)/(B-A)*(D-C)+C;
    }

})