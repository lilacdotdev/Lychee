import "./Calendar.css";

function Calendar(){
    return (
        <main className="Container">
            <h1 className="Month">Month</h1>
            <div className="Calendar">
                <p>Sunday</p>
                <p>Monday</p>
                <p>Tuesday</p>
                <p>Wednesday</p>
                <p>Thursday</p>
                <p>Friday</p>
                <p>Saturday</p>
            </div>
        </main>
    );
}

export default Calendar;