// "use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

//
// 01. Using the Geolocation API (Done)
// 02. Displaying a Map Using Leaflet Library (Done)
// 03. Displaying a Map Marker (Done)
// 04. Rendering Workout Input Form (Done)
// 05. Project Architecture (Done)
// 06. Refactoring for Project Architecture (Done)
// 08. Managing Workout Data Creating Classes (Done)
// 09. Creating a New Workout (Done)
// 10. Rendering Workouts (Done)
// 11. Move to Marker On Click (Done)
// 12. Working with localStorage (Done)

class Workouts {
  date = new Date();
  id = Date.now().toString().slice(-10);
  type;
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // Array or [latitude and longitude]
    this.distance = distance; // in Km
    this.duration = duration; // in mins
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workouts {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min per km (min/km)
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workouts {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Testing methods

// let run1 = new Running([30, -12], 5.2, 24, 178);
// let cycling1 = new Cycling([30, -12], 5.2, 24, 178);
// console.log(run1, cycling1);

////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    // Get users position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          this._loadMap(position);
        }.bind(this),

        function () {
          alert(`Can't get your position`);
        }
      );
    }
  }

  _loadMap(position) {
    let latitude = position.coords.latitude;
    let longitude = position.coords.longitude;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    let coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    // Empty Input
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();

    let validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    let allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // Get data from form
    let type = inputType.value;
    let distance = +inputDistance.value;
    let duration = +inputDuration.value;
    let workout;
    let { lat, lng } = this.#mapEvent.latlng;

    // If workout is running create a running object
    if (type === "running") {
      let cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive!");

      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling create a cycling object
    if (type === "cycling") {
      let elevation = +inputElevation.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(elevation)
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive!");

      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // A new object of workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout, type);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input
    this._hideForm();

    // Set localStorage to all workouts\
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout, type) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === "running") {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>`;
    }

    if (workout.type === "cycling") {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>`;
    }
    html += `</li>`;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    let workoutElement = e.target.closest(".workout");
    // console.log(workoutElement);

    if (!workoutElement) return;

    let workout = this.#workouts.find(function (work) {
      return work.id === workoutElement.dataset.id;
    });

    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // usning the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    let data = JSON.parse(localStorage.getItem("workouts"));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    // this.#workouts.forEach(function (work) {
    //   this._renderWorkout(work);
    // }.bind(this));

    this.#workouts.forEach((work) => {
      return this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

let app = new App();
