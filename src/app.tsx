
export const App = () => (
  <>
    <div>
      <input type="text" id="channel" placeholder="...channel" />
      <button type="button" id="submit">Submit</button>
    </div>
    <div>
      <table id="commands">
        <thead>
          <tr>
            <th>Command</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <div>
      <table id="sounds">
        <thead>
          <tr>
            <th>Sound</th>
            <th>Command (click to copy)</th>
            <th>Play</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </>
)