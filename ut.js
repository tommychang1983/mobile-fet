/**
 * @author changqi
 * Unit Test for mobile browser.
 * 
 */
var t = t ||{};
(function(t){
	var cases = [];
	t.goNext = true;
	//每个测试的间隔时间
	var stepTime = t.stepTime||100;
	//异步测试的检测时间
	var checkTime = 100;
	
	//最大异步等待时间为10s
	//var MAX_WAITING_TIME = 10000;
	var MAX_WAITING_TIME = 2000;
	var waitingTime = 0;

	
	/**
	 * 添加case加入到执行列表中。
	 */
	t.add = function(caseName,testcase){
		var c = {};
		c.caseName = caseName;
		c.origJson = testcase;
		c.exeArr = [];
		//存储每一个test的测试状态.
		c.state = [];
		for(var i in testcase){
			//testcase中，凡是不是下划线开头的function，均加入到执行列表中。
			if(i.toString().indexOf("_")!=0 && testcase[i] instanceof Function){
				c.exeArr.push({id:i,test:testcase[i]});
			}
		}
		cases.push(c);		
	}
	
	addEvent(window,"load",function(){
		t.root = (t.rootId == undefined)?(document.getElementsByTagName("body")[0]):g(t.rootId);
		window.scrollTo(0, 1);
		buildUI();
		exeNextCases();
	});
	
	/************************
	 *    核心运行时逻辑
	 * 
	 * 
	 * 
	*************************/
	
	var currentIndex = 0;
	var currentTestIndex = 0;
	
	/**
	 * 当前执行的case是否为Fail状态。有两种情况会将case置为fail：
	 * 		1.同步执行情况下catch异常Error；2.异步情况下onerror监听到异常Error
	 * 
	 */
	var currentFail = false;
	/**
	 * 执行下一个Test，当当前case结束，则转到下一个case，如果全部case结束，则执行结束。
	 */
	function exeNextCases(){
		t.goNext = true;
		if(cases[currentIndex]!=undefined){
			//表示当前case完成执行，需要跳到下一个case继续。
			if(cases[currentIndex].exeArr[currentTestIndex]==undefined){
				currentIndex++;
				currentTestIndex = 0;
				setTimeout(exeNextCases,0);
			}else{
				//表示有此case，需要进行执行
				
				//需要清除前一个的状态值：重置当前test是否失败；重置等待时间。
				currentFail = false;
				waitingTime = 0;
				
				setState("running");
				var exeFun = cases[currentIndex].exeArr[currentTestIndex].test;
				try{
					exeFun.apply(cases[currentIndex].origJson);
				}catch(e){
					currentFail=true;
					t.err(e);
				}
				if(t.goNext == false){
					//说明是异步测试，需要在测试结束后在将index进行加一操作。
					setTimeout(checkGoNext,checkTime);
				}else{
					judgeState();
					goNext();
				}
			}
		}
	} 
	/**
	 * 检测是否可以开始下一个测试。
	 */
	function checkGoNext(){
		if(t.goNext == false&&waitingTime<=MAX_WAITING_TIME){
			waitingTime +=checkTime;
			setTimeout(checkGoNext,checkTime);
		}else{
			judgeState();
			goNext();
		}
	}
	/**
	 * 判断当前执行的test状态是fail还是pass。
	 */
	function judgeState(){
		//如果超时，则需要发布timeout exception.
		//不能直接抛一个exception，否则后续的操作就不能进行了。
		if(currentFail == true || waitingTime>MAX_WAITING_TIME){
			setState("fail");
		}else{
			setState("pass");
		}
	}
	function goNext(){
		currentTestIndex++;
		setTimeout(exeNextCases,stepTime);
	}
	
	window.onerror = function(e){
		currentFail = true;
		t.err(e);
		t.goNext = true;
		
		return true;
	}

	/************************
	 *    UI展现构造逻辑
	 * 
	 * 
	 * 
	*************************/
	function buildUI(){
		for(var i=0,len=cases.length;i<len;i++){
			var caseName = cases[i].caseName;
			for(var j=0,len2=cases[i].exeArr.length;j<len2;j++){
				var testName = cases[i].exeArr[j].id;
				var item = document.createElement("DIV");
				item.id = "item_"+caseName+"_"+testName;
				item.className = "unrun test_item";
				item.innerHTML = "<div class='side_state'></div><div id='"+item.id+"_title'>"+caseName+"::"+testName+"</div><div id='"+item.id+"_log'></div>";
				t.root.appendChild(item);
			}
		}
	}
	
	t.log = function (msg){
		
		var caseName = cases[currentIndex].caseName;
		var testName = cases[currentIndex].exeArr[currentTestIndex].id;
		var currentItem = g("item_"+caseName+"_"+testName+"_log");
		currentItem.innerHTML +=(msg+"<br/>");
	}
	t.err = function(msg){
		if(typeof msg == "string"){
			t.log("<span class='err'>"+msg+"</span>");
		}else if( msg instanceof Error){
			t.log("<span class='err'>error Msg:"+msg.message+" in line:"+(msg.line == undefined ?(msg.lineNumber):msg.line)+"</span>");
			(msg.stack==undefined)?t.log("<span class='err'>stack trace(opt):"+msg.stack+"</span>"):"";
		}
	}
	
	/*****************
	 *    断言部分
	 * 
	 * 
	 * 
	 *****************/
	t.is = function(test,expect){
		var handler = getHandler(test);
		return handler(test,expect);
	}
	
	function getHandler(test,expect){
		if(test instanceof Array){
			return objHandler;
		}else if(test instanceof Date){
			return dateHandler;
		}else if(test instanceof RegExp){
			return regHandler;
		}else if(test instanceof Object){
			return objHandler;
		}else{
			return commonHandler;
		}
	}
	function arrayHandler(){};
	function dateHandler(){};
	function regHandler(){}
	function objHandler(real,expect){
	    var isSame = (expect === real);
	    //shortpath for references to same object
	    var isEqual = ((type = _trueTypeOf(expect)) == _trueTypeOf(real) );
	    if (isEqual && !isSame) {
	        switch (type) {
	        	case 'Null':
	            case 'String':
	            case 'Number':
	                isEqual = (expect == real);
	                break;
	            case 'Boolean':
	            case 'Date':
	                isEqual = (expect === real);
	                break;
	            case 'RegExp':
	            case 'Function':
	                isEqual = (expect.toString() === real.toString());
	                break;
	            default: //Object | Array
	                var i;
	                if (isEqual = (expect.length === real.length))
	                    for (i in expect)
	                        objHandler(real[i],expect[i]);
	        }
	
	    }
	    if(!isEqual){
			currentFail = true;
			t.err("assertError: expect:"+expect+" but the real:"+real);	    	
	    }

		return true;
		
	};
	_trueTypeOf = function(something) {
		//avoid if the something is null, and typeof something is object, this will lead something.constructor throw some error
		if(something == null){
			return 'Null';
		}
	    var result = typeof something;
	    try {
	        switch (result) {
	            case 'string':
	            case 'boolean':
	            case 'number':
	                break;
	            case 'object':
	            case 'function':
	                switch (something.constructor)
	                        {
	                    case String:
	                        result = 'String';
	                        break;
	                    case Boolean:
	                        result = 'Boolean';
	                        break;
	                    case Number:
	                        result = 'Number';
	                        break;
	                    case Array:
	                        result = 'Array';
	                        break;
	                    case RegExp:
	                        result = 'RegExp';
	                        break;
	                    case Function:
	                        result = 'Function';
	                        break;
	                    default:
	                        var m = something.constructor.toString().match(/function\s*([^( ]+)\(/);
	                        if (m)
	                            result = m[1];
	                        else
	                            break;
	                }
	                break;
	        }
	    }
	    finally {
	        result = result.substr(0, 1).toUpperCase() + result.substr(1);
	        return result;
	    }
	}
		
	
	
	function commonHandler(test,expect){
		if(test !== expect){
			currentFail = true;
			t.err("assertError: expect:"+expect+" but the real:"+test);
		}
		
		return true;
	}
	
	function setState(state){
		cases[currentIndex].state[currentTestIndex] = state;
		var caseName = cases[currentIndex].caseName;
		var testName = cases[currentIndex].exeArr[currentTestIndex].id;
		var currentItem = g("item_"+caseName+"_"+testName);
		currentItem.className = state+" test_item";
	}
	
	
	function addEvent(obj,type,fn){
	    if(obj.attachEvent){
	        obj.attachEvent('on' + type, fn);
	    }else if(obj.addEventListener){
	        obj.addEventListener(type, fn, false);
	    }
	}
	
	function g(id){
		return document.getElementById(id);
	}
})(t);

 
 
 