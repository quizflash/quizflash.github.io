const choo = window.Choo; // choojs
const html = window.html; // nanohtml

const app = window.Choo();

/* constants */
//const backButton = html`<a href="/">Go Back</a>`;
const backButton = html`<button onclick=${() => {history.go(-1);}}>Go Back</button>`;
const homeButton = html`<a href="/"><button>Home</button></a>`;
const navBar = html`<nav>${homeButton}${backButton}</nav>`;

const dialog = document.getElementsByTagName('dialog')[0];

/* helper functions */
function importSetFromTextarea(e) {
	/* button event handler. expects a textarea#import-input to be present */
	if (app.state.set.length > 0 && !confirm(`Do you want to overwrite ${app.state.set.length} terms from the currently loaded set?`))
		return; /* user pressed cancel or no current terms */
	
	/* clear existing set */
	clearExistingSet();
	
	mergeSetFromTextarea();
}

function mergeSetFromTextarea(e) {
	/* button event handler. expects a textarea#import-input to be present */
	
	const ta = document.getElementById('import-input');
	if (!ta) return alert('Something went wrong. Refresh and try again.');
	
	const terms = ta.value
									 .split('\n')
									 .filter(line => line.length > 0)
									 .map(line => line.split('\t'))
									 .filter(term => term.length == 2)
									 .filter(term => term[0].length > 0 && term[1].length > 0);
	
	if (terms.length < ta.value.split('\n').length)
		alert(`${ta.value.split('\n').length - terms.length} invalid line(s) skipped`);
	
	importSetMerge(terms);
	
	/* update "terms loaded" counter and clear textarea */
	app.emit(app.state.events.RENDER);
	
	alert('Terms added!');
}

function testCheckBox(category, attrname, label, callback, info, disable) {
	const inp = html`<input type="checkbox" id="${attrname}" checked=${app.state.options.test[category][attrname]} ${disable ? 'disabled' : ''}>`;
	inp.addEventListener('change', (e) => {
		app.state.options.test[category][attrname] = e.currentTarget.checked;
		if (callback) callback();
	});
	
	let tooltip;
	if (info)
		tooltip = html`<span class="tooltip" title="${info}">[?]</span>`;
	
	return html`
		<p>
			${inp}
			<label for="${attrname}">${label}</label>
			${tooltip}
		</p>
	`;
}

function addTermDialog() {
	/* currently unused */
	morphdom(dialog, html`<dialog>
		<a id="close" onclick=${() => {dialog.close('closeButtonClicked');}}>x</a>
		<h1>Add Term</h1>
		<textarea id="term-input" rows="1" cols="30" placeholder="Enter term here"></textarea>
		<br>
		<textarea id="definition-input" rows="3" cols="30" placeholder="Enter definition here"></textarea>
		<br>
		<button onclick=${addTermFromTextarea}>Add</button>
	</dialog>`);
	dialog.showModal();
}

function testOptionsDialog() {
	const otq =  app.state.options.test.questions
	const q_count = otq.count;
	const q_count_inp = html`<input type="number" id="count" min="1" max="${app.state.set.length}" value="${q_count < 0 ? app.state.set.length : q_count}">`;
	q_count_inp.addEventListener('input', (e) => {
		otq.count = Math.max(Math.min(e.currentTarget.value, 12), 1)
	});
	q_count_inp.addEventListener('blur', (e) => {
		e.currentTarget.value = Math.max(Math.min(e.currentTarget.value, 12), 1);
	});
	
	function validateAnswer() {
		document.getElementById('answer-error').hidden = (otq.answerTerm || otq.answerDefn)
	}
	
	if (!(otq.answerTerm || otq.answerDefn))
		otq.answerTerm = true;

	morphdom(dialog, html`<dialog class="test-options">
		<a id="close" onclick=${() => dialog.close('closeButtonClicked')}>x</a>
		<h1>Test Options</h1>
		<h3>General</h3>
		<p>
			${q_count_inp}
			<label for="count">Question Count</label>
		</p>
		${testCheckBox("questions", "starred", "Study Starred Terms Only", null, "Coming Soon!", true)}
		${testCheckBox("questions", "answerTerm", "Answer with Term", validateAnswer)}
		${testCheckBox("questions", "answerDefn", "Answer with Definition", validateAnswer)}
		<p id="answer-error" class="error" ${!(otq.answerTerm || otq.answerDefn) ? '' : 'hidden'}>You must answer with a term, definition, or both.</p>
		<h3>Question Types</h3>
		${testCheckBox("types", "written", "Written")}
		${testCheckBox("types", "matching", "Matching")}
		${testCheckBox("types", "multiple", "Multiple Choice")}
		${testCheckBox("types", "truefalse", "True/False")}
		<br>
		<h3>Grading</h3>
		${testCheckBox("grading", "oneAnswer", "Require one answer only", null, "Answers should be seperated by a comma (,), semicolon (;), or slash (/).")}
		${testCheckBox("grading", "typo", "Allow minor spelling mistakes", null, "Coming soon!", true)}
	</dialog>`);
	dialog.showModal();
}

function addTermFromTextarea(e) {
	const term = document.getElementById('term-input');
	const defn = document.getElementById('definition-input');
	
	if (term.value.length + defn.value.length < 1)
		return alert('must enter something');
	
	app.state.set.push([term.value, defn.value]);
	term.value = '';
	defn.value = '';
	
	dialog.close('termAdded');
	app.emit('render');
}

function importSetMerge(terms) {
	app.state.set.push(...terms);
}

function clearExistingSet() {
	app.state.set.length = 0; /* should work everywhere: https://stackoverflow.com/a/1232046 */
	/* also reset state of activities */
	app.state.flashcards = getDefaultFlashcardState(app.state);
}

function getDefaultFlashcardState(state) {
	return {
		card: 0, /* card number */
		isTerm: state.options.flashcards.defaultTerm, /* currently showing term? */
	};
}

/* https://stackoverflow.com/a/1349426 */
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

/* setup state */
app.use((state, emitter) => {
	state.set = [];
	state.options = {
		flashcards: {
			defaultTerm: true, /* show term and flip for definition */
		},
		test: {
			types: {
				written: true,
				matching: true,
				multiple: true,
				truefalse: true,
			},
			grading: {
				oneAnswer: false, /* valid responses are split by /,; */
				typo: false, /* allow minor spelling mistakes */
			},
			questions: {
				count: -1, /* means set size */
				starred: false, /* only study starred term/defn */
				answerTerm: true, /* answer with term? */
				answerDefn: false,
				/* prompt will automatically use opposite */
			},
		},
	};
	state.flashcards = getDefaultFlashcardState(state);
});

/* track history stack depth to autohide "Go Back" button when redundant (experimental) */
app.use((state, emitter) => {
	state.historyStackDepth = 0;
	
	emitter.on(state.events.PUSHSTATE, () => {
		state.historyStackDepth++;
		backButton.hidden = state.historyStackDepth <= 2;
	});
	emitter.on(state.events.POPSTATE, () => {
		state.historyStackDepth--;
		backButton.hidden = state.historyStackDepth <= 2;
	});
	emitter.on(state.events.NAVIGATE, () => {
		// check for root /
		if (state.href == '/' || state.href == '') {
			state.historyStackDepth = 0;
			backButton.hidden = true;
		}
	});
});

app.route('/', (state, emit) => {
	return html`<main>
			<h1>Flashcards</h1>
			<p>A simple, Quizlet compatible flashcard studying system</p>
			<p><b>Note:</b> Flashcards is still in development and features may not work. Please report any bugs to the author.</p>
			<br>
			<ul>
				<li><a href="/import">Import Study Set from Quizlet</a></li>
				<li><a href="/terms">Manage Terms</a></li>
				<li><a href="/flashcards">Flashcards</a></li>
				<li><a href="/learn">Learn</a></li>
				<li><a href="/test">Test Yourself</a></li>
			</ul>
			<br>
			<a href="/test" onclick=${() => importSetMerge(`Term A	Definition A
Term B	Definition B
Term C	Definition C
Term D	Definition D
Term E	Definition E
Term F	Definition F
Duplicate Term 1	DT1:Definition A
Duplicate Term 1	DT1:Definition B
DD1:Term A	Duplicate Definition 1
DD1:Term B	Duplicate Definition 1
Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term Very Long Term	Short Definition
Short Term	Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition Very Long Definition`.split('\n')
									 .filter(line => line.length > 0)
									 .map(line => line.split('\t'))
									 .filter(term => term.length == 2))}>~debug</a>
		</main>`;
});

app.route('/import', (state, emit) => {
	let mergeButton = html`<button onclick=${mergeSetFromTextarea}>Merge with Existing</button>`;
	if (state.set.length < 1)
		mergeButton.hidden = true;
	
	return html`<main>
		${navBar}
		<br>
		<h1>Import Study Set from Quizlet</h1>
		<p>${state.set.length} term${state.set.length == 1 ? '' : 's'} loaded</p>
		<details>
			<summary>Instructions</summary>
			<ol>
				<li>Open the Quizlet Study Set page</li>
				<li>Click the three dots on the right of the author</li>
				<li>Click Export</li>
				<li>Press "Copy text" (do not change any of the settings)</li>
				<li>Close the Quizlet Study Set page</li>
				<li>Select the text box below (on this page) and press paste</li>
				<li>Press the Import button</li>
			</ol>
		</details>
		<br>
		<textarea id="import-input" rows="10" cols="50" placeholder="Paste exported set here"></textarea>
		<br>
		<button onclick=${importSetFromTextarea}>Import</button>
		${mergeButton}
	</main>`;
});

app.route('/terms', (state, emit) => {
	const noTerms = html`<p>You do not have any terms right now. You can either <a href="/import">load a set from Quizlet</a> or <a onclick=${addTermDialog}>add a term</a>.</p>`;
	
	const termInput = html`<input type="text" id="term-input" placeholder="Enter term here">`;
	
	const addTermButton = html`<button onclick=${() => {
		addTermFromTextarea();
		/* wait for rerender */
		setTimeout(() => document.getElementById('term-input').focus(), 10);
	}}>Add</button>`;
	
	const clearTermsButton = html`<button ${state.set.length > 0 ? '' : 'hidden'} onclick=${() => {
			if (!confirm('Are you sure you want to clear all terms?')) return;
			clearExistingSet()
			emit(state.events.RENDER);
		}}>Clear Existing Terms</button>`;
		
	const editHeader = html`<div id="edit-header">
		<button onclick=${() => termInput.focus()}>Add a Term</button>
		<button onclick=${() => alert('edit still wip')}>Edit Terms</button>
		${clearTermsButton}
	</div>`;
	
	const termList = html`<table>
	  ${state.set.map(term => html`<tr><td class="term">${term[0]}</td><td class="definition">${term[1]}</td><td class="controls"></td></tr>`)}
		<tr class="add-term">
			<td class="term">
				${termInput}
			</td>
			<td class="definition">
				<input type="text" id="definition-input" placeholder="Enter definition here">
			</td>
			<td class="controls">
				${addTermButton}
			</td>
		</tr>
	</table>`;
	
	if (state.set.length > 0) noTerms.hidden = true;
	//else termList.hidden = true;
	
	return html`<main>
		${navBar}
		<br>
		<h1>Manage Terms</h1>
		${noTerms}
		${editHeader}
		${termList}
	</main>`;
});

app.route('/flashcards', (state, emit) => {
	if (state.set.length < 1)
		return html`<main>
			${navBar}
			<br>
			<h1>Nothing to Study!</h1>
			<p>You do not have any terms loaded. You can <a href="/import">import terms</a> or <a href="/terms">manage terms</a>.</p>
		</main>`;
	
	const flip = () => {
		const card = document.getElementById('flashcard');
		state.flashcards.isTerm = !state.flashcards.isTerm;
		if (state.flashcards.isTerm)
			card.classList.remove('show-defn');
		else
			card.classList.add('show-defn');
	};

	const left = () => {
		if (state.flashcards.card - 1 < 0) return;
		state.flashcards.card = state.flashcards.card - 1;
		state.flashcards.isTerm = state.options.flashcards.defaultTerm;
		emit('render');
	};

	const right = () => {
		if (state.flashcards.card + 1 == state.set.length) return;
		state.flashcards.card = state.flashcards.card + 1;
		state.flashcards.isTerm = state.options.flashcards.defaultTerm;
		emit('render');
	};

	const handler = (e) => {
		if (e.keyCode == 32 || e.keyCode == 13) { // Enter or shift key
			e.preventDefault();
			flip();
		} else if (e.keyCode == 39) { // Left arrow
			e.preventDefault();
			right()
		} else if (e.keyCode == 37) { // Right arrow
			e.preventDefault();
			left()
		}
	};
	document.body.addEventListener('keydown', handler);
	app.emitter.on('render', () => {document.body.removeEventListener('keydown', handler);});
	
	const term = html`<p class="term ${state.flashcards.isTerm ? 'selected' : ''}" data-nanomorph-component-id="term-${makeid(15)}">${state.set[state.flashcards.card][0]}</p>`;
	const defn = html`<p class="definition ${state.flashcards.isTerm ? '' : 'selected'}" data-nanomorph-component-id="defn-${makeid(15)}">${state.set[state.flashcards.card][1]}</p>`;
	const card = html`<div id="flashcard" class="flashcard" onclick=${flip}>
			<div class="flashcard-inner">
				${term}
				${defn}
			</div>
		</div>`;
	
	const controls = html`<center id="flashcard-controls">
		<button onclick=${() => {left(); this.blur();}}>⬅️</button>
		<button onclick=${() => {flip(); this.blur();}}>🔁</button>
		<button onclick=${() => {right(); this.blur();}}>➡️</button>
	</center>`;

	return html`<main>
		${navBar}
		<br>
		<h1>Flashcards</h1>
		<br>
		${controls}
		${card}
	</main>`;
});

/** Quizlet test options

Types:
- [ ] Written: type out answer
- [ ] Matching: Implement using dropdowns/order by remaining, disable but show used responses
- [ ] Multiple choice: 4 choices, pick
- [ ] True/False: give a term/defn combo, answer correct or not

Question count:
0 < c <= set.length

Grading:
- [ ] Typo help: ignore small spelling differences when doing written
- [ ] Require one answer only: defns can be split by /,;

Question options:
- Study [all|starred]
- Answer with [term|defn|both]
- Prompt with [term|defn|both]
*/

app.route('/test', (state, emit) => {
	if (state.set.length < 1)
		return html`<main>
			${navBar}
			<br>
			<h1>Nothing to Study!</h1>
			<p>You do not have any terms loaded. You can <a href="/import">import terms</a> or <a href="/terms">manage terms</a>.</p>
		</main>`;
	
	return html`<main>
		${navBar}
		<br>
		<h1>Test</h1>
		<button id="test-options" onclick=${testOptionsDialog}>⚙️</button>
		<br>
		<p>work in progress</p>
	</main>`;
});

app.route('/about', (state, emit) => {
	return html`<main>
		${navBar}
		<br>
		<h1>About Flashcards</h1>
		<p>Basically, it exists because Quizlet started paywalling essential study tools.</p>
		<p>This tool is completely free and does not share any of your data. For more information, see the <a href="/privacy">Privacy Policy</a></p>
	</main>`;
});

app.route('/privacy', (state, emit) => {
	return html`<main>
		${navBar}
		<br>
		<h1>Privacy Policy</h1>
		<details>
			<summary>TL;DR</summary>
			Your private information (study sets, statistics, etc.) remain on your computer and is never stored.
		</details>
		<h3>Flashcards is designed in a way that:</h3>
		<ul>
			<li>No personal information ever leaves your computer</li>
			<li>The only information that the page host can see is your url, and only if you refresh the page</li>
			<li>Information is only retained for the duration of your study session, and is lost upon refreshing the page</li>
			<li>No cookies or localstorage is used</li>
			<li>There are no ads or third party scripts<a href="#note">*</a></li>
			<li>No analytics are collected</li>
		</ul>
		<br>
		<p id="note">Jsfiddle (where development takes place) injects its own scripts to provide functionality. I do not believe the scripts perform any tracking. As far as I know, Github Pages does not inject anything at all.</p>
	</main>`;
});

/* 404 handler */
app.route('*', (state, emit) => {
	return html`<main>
			${navBar}
			<br>
			<h1>404 Not Found</h1>
			<p>This page could not be found.</p>
			<p><a href="/">Go back to homepage</a></p>
		</main>`;
});

/* jsfiddle workaround */
const jsfiddle = (state, emit) => {
	return html`<main><p>jsfiddle is wacky. Try opening this directly instead. Alternatively, you can try to <a href="/">go home</a>.</p></main>`;
};

app.route('/_display', jsfiddle);
app.route('/pipythonmc/:projectid/:version/show', jsfiddle);

app.use((state, emitter) => {
	emitter.on(state.events.DOMCONTENTLOADED, () => {
		if (state.href.startsWith('/_display') || state.href.startsWith('/pipythonmc')) /* is running on jsfiddle? */
			setTimeout(() => emitter.emit(state.events.PUSHSTATE, '/'), 0); /* workaround so it pushes after initial render */
	});
});

/* end jsfiddle workaround */

app.mount('main');
