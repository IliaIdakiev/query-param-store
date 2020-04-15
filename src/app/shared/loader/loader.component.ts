import { Component, Input, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent implements AfterViewInit {

  @Input() isLoading = false;


  showMessage = false;

  ngAfterViewInit() {
    setTimeout(() => {
      this.showMessage = true;
    }, 6000);
  }
}
