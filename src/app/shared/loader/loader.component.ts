import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent implements OnChanges {

  @Input() isLoading = false;

  showMessage = false;

  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges.isLoading.currentValue) {
      setTimeout(() => {
        if (this.isLoading === false) { return; }
        this.showMessage = true;
      }, 6000);
    } else {
      this.showMessage = false;
    }
  }
}
